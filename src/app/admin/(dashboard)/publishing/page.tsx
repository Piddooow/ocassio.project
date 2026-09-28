import type { Metadata } from "next";
import { PublishingPanel } from "@/components/admin/PublishingPanel";

export const metadata: Metadata = { title: "Publishing" };

interface AdminPublishingPageProps {
  searchParams: Promise<{ queue?: string }>;
}

/** Admin → Publishing (§8): Drafts, Scheduled, Published. */
export default async function AdminPublishingPage({
  searchParams,
}: AdminPublishingPageProps) {
  const { queue } = await searchParams;
  const initialQueue =
    queue === "scheduled" || queue === "published" ? queue : "drafts";

  return (
    <>
      <h1 className="font-display text-display-sm">Publishing</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Everything across the studio in one place: what is being written,
        what is waiting for its moment, and what is live.
      </p>
      <div className="mt-8">
        <PublishingPanel initialQueue={initialQueue} />
      </div>
    </>
  );
}
