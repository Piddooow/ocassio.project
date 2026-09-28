import type { Metadata } from "next";
import { listRecentActivity } from "@/lib/db/queries/activity";

export const metadata: Metadata = { title: "Activity Log" };

function formatStamp(value: Date): string {
  return value.toISOString().replace("T", " ").slice(0, 16);
}

/** Admin → Activity Log (§9): append-only record of admin changes. */
export default async function AdminActivityPage() {
  const entries = await listRecentActivity(25);

  return (
    <>
      <h1 className="font-display text-display-sm">Activity Log</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        An append-only record of admin changes across the studio. Newest
        first.
      </p>
      <div className="mt-8" data-activity-list>
        {entries.length === 0 ? (
          <p className="text-body-sm text-secondary">
            No activity recorded yet.
          </p>
        ) : (
          <ul>
            {entries.map((entry) => (
              <li
                key={entry.id}
                data-activity-row
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line py-3 first:border-t"
              >
                <span className="text-body-sm text-primary">
                  {entry.summary}
                </span>
                <span className="text-caption text-muted">
                  {entry.entityType} · {formatStamp(new Date(entry.createdAt))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
