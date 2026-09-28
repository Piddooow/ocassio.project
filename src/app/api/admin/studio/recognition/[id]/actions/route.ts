import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  recognitionPublishIssues,
  statusForAction,
  validatePublishAction,
} from "@/lib/db/queries/publishing";
import {
  getRecognitionById,
  updateRecognition,
} from "@/lib/db/queries/studio-admin";

/**
 * Recognition publish workflow (§24, §38).
 * POST /api/admin/studio/recognition/[id]/actions  body: { action }
 */
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid entry id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getRecognitionById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Entry not found: ${id}.` },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validated = validatePublishAction(body, { allowSchedule: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  if (validated.action === "publish") {
    const issues = recognitionPublishIssues(existing);
    if (issues.length > 0) {
      return NextResponse.json(
        { error: "Cannot publish. Resolve the issues.", issues },
        { status: 422 },
      );
    }
  }

  const { status } = statusForAction(validated.action, validated.publishAt);
  const updated = await updateRecognition(id, { status });
  return NextResponse.json({ data: updated });
}
