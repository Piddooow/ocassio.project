"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusChip } from "@/components/ui/StatusChip";
import { adminRequest, issuesText } from "@/lib/admin-client";
import { AdminListSkeleton } from "./AdminListSkeleton";

type Queue = "drafts" | "scheduled" | "published";

interface QueueItem {
  entityType: string;
  id: number;
  title: string;
  slugOrKey: string | null;
  status: string;
  publishAt: string | null;
  updatedAt: string;
}

const TABS: Array<{ queue: Queue; label: string }> = [
  { queue: "drafts", label: "Drafts" },
  { queue: "scheduled", label: "Scheduled" },
  { queue: "published", label: "Published" },
];

/**
 * Publishing queues (§8): Drafts, Scheduled, and Published aggregated
 * across every content type. Read-only; each item publishes from its own
 * module.
 */
export function PublishingPanel({ initialQueue }: { initialQueue: Queue }) {
  const [queue, setQueue] = useState<Queue>(initialQueue);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [counts, setCounts] = useState<Record<Queue, number> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (target: Queue) => {
    setLoaded(false);
    const { ok, body } = await adminRequest<QueueItem[]>(
      `/api/admin/publishing?queue=${target}`,
    );
    if (ok) {
      setItems(body?.data ?? []);
      const meta = body?.meta as { counts?: Record<Queue, number> } | undefined;
      setCounts(meta?.counts ?? null);
      setError(null);
    } else {
      setError(issuesText(body));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load(queue);
  }, [load, queue]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.queue}
            type="button"
            data-publishing-tab={tab.queue}
            aria-pressed={queue === tab.queue}
            onClick={() => setQueue(tab.queue)}
            className={`min-h-11 rounded-pill border px-4 text-body-sm transition-colors ${
              queue === tab.queue
                ? "border-line-strong bg-surface-hover text-primary"
                : "border-line text-secondary hover:text-primary"
            }`}
          >
            {tab.label}
            {counts ? ` (${counts[tab.queue]})` : ""}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}

      {!loaded ? (
        <AdminListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <p className="text-body-sm text-secondary">
          Nothing in this queue right now.
        </p>
      ) : (
        <ul data-publishing-list>
          {items.map((item) => (
            <li
              key={`${item.entityType}-${item.id}`}
              data-publishing-row
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4 first:border-t"
            >
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium text-primary">
                  {item.title}
                </p>
                <p className="mt-1 text-caption text-muted">
                  {item.entityType} · #{item.id}
                  {item.slugOrKey ? ` · ${item.slugOrKey}` : ""}
                  {item.publishAt ? ` · publishes ${item.publishAt}` : ""}
                </p>
              </div>
              <StatusChip tone={item.status === "published" ? "success" : "neutral"}>
                {item.status}
              </StatusChip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
