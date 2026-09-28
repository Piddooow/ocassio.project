import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  servicePublishIssues,
  statusForAction,
  validatePublishAction,
} from "@/lib/db/queries/publishing";
import { getServiceById, updateService } from "@/lib/db/queries/services-admin";

/**
 * Service publish workflow (§24, §38):
 * SAVE DRAFT → VALIDATE → PREVIEW → PUBLISH.
 * POST /api/admin/services/[id]/actions  body: { action }
 *
 * Preview is served by GET /api/admin/services/[id]; the public API
 * only ever sees published services.
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
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid service id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getServiceById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Service not found: ${id}.` },
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
    const issues = servicePublishIssues(existing);
    if (issues.length > 0) {
      return NextResponse.json(
        { error: "Cannot publish. Resolve the issues.", issues },
        { status: 422 },
      );
    }
  }

  const { status } = statusForAction(validated.action, validated.publishAt);
  const updated = await updateService(id, { status });
  return NextResponse.json({ data: updated });
}
