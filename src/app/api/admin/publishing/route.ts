import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  isPublishingQueue,
  listPublishingQueue,
  publishingQueueCounts,
  PUBLISHING_QUEUES,
} from "@/lib/db/queries/publishing-queues";

/**
 * Publishing queues (§8).
 * GET /api/admin/publishing?queue=drafts|scheduled|published
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const queue = request.nextUrl.searchParams.get("queue") ?? "drafts";
  if (!isPublishingQueue(queue)) {
    return NextResponse.json(
      { error: `queue must be one of: ${PUBLISHING_QUEUES.join(", ")}.` },
      { status: 400 },
    );
  }

  const [items, counts] = await Promise.all([
    listPublishingQueue(queue),
    publishingQueueCounts(),
  ]);
  return NextResponse.json({
    data: items,
    meta: { queue, total: items.length, counts },
  });
}
