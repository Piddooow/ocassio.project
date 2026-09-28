import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  buildVersionSnapshot,
  recordVersion,
} from "@/lib/db/queries/version-history";
import {
  createProject,
  listAllProjects,
  validateProjectInput,
  type ProjectInput,
} from "@/lib/db/queries/projects-admin";
import { WORK_CATEGORIES } from "@/lib/db/schema";

/**
 * Portfolio projects collection (§11, §12).
 * GET  /api/admin/projects -> every state plus category options
 * POST /api/admin/projects -> create as draft (validation §11)
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const rows = await listAllProjects();
  return NextResponse.json({
    data: rows,
    meta: { total: rows.length, categories: WORK_CATEGORIES },
  });
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validated = validateProjectInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const result = await createProject(validated.value as ProjectInput);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: result.issues },
      { status: result.status },
    );
  }

  const snapshot = await buildVersionSnapshot("project", result.detail.project.id);
  if (snapshot !== null) {
    await recordVersion("project", result.detail.project.id, snapshot);
  }
  await recordActivity({
    action: "created",
    entityType: "project",
    entityId: result.detail.project.id,
    summary: `Project created: ${result.detail.project.title}`,
  });

  return NextResponse.json({ data: result.detail }, { status: 201 });
}
