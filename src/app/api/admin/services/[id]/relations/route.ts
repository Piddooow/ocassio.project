import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { listFaqByIds } from "@/lib/db/queries/faq-admin";
import {
  getServiceById,
  listServiceFaqRelations,
  listServiceProjectRelations,
  replaceServiceFaqRelations,
  replaceServiceProjectRelations,
  validateServiceRelationsInput,
} from "@/lib/db/queries/services-admin";

/**
 * Admin Service Detail relations (§6.5): selected work + related FAQ.
 * GET /api/admin/services/[id]/relations -> current relation sets
 * PUT /api/admin/services/[id]/relations -> replace provided sets
 *
 * Pricing is already scoped by pricing.serviceId through the pricing
 * CRUD endpoints; this route covers projects and FAQ only.
 */
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
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

  const service = await getServiceById(id);
  if (!service) {
    return NextResponse.json(
      { error: `Service not found: ${id}.` },
      { status: 404 },
    );
  }

  const [projects, faqIds] = await Promise.all([
    listServiceProjectRelations(id),
    listServiceFaqRelations(id),
  ]);
  return NextResponse.json({ data: { projects, faqIds } });
}

export async function PUT(
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

  const service = await getServiceById(id);
  if (!service) {
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

  const validated = validateServiceRelationsInput(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  if (validated.value.faqIds !== undefined) {
    const found = await listFaqByIds(validated.value.faqIds);
    if (found.length !== validated.value.faqIds.length) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          issues: ["faqIds must reference existing FAQ entries."],
        },
        { status: 400 },
      );
    }
    await replaceServiceFaqRelations(id, validated.value.faqIds);
  }
  if (validated.value.projects !== undefined) {
    await replaceServiceProjectRelations(id, validated.value.projects);
  }

  const [projects, faqIds] = await Promise.all([
    listServiceProjectRelations(id),
    listServiceFaqRelations(id),
  ]);
  return NextResponse.json({ data: { projects, faqIds } });
}
