import type { Metadata } from "next";
import { FaqPanel } from "@/components/admin/FaqPanel";

export const metadata: Metadata = { title: "FAQ" };

/** Admin → Services → FAQ (§12.4). */
export default function AdminFaqPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">FAQ</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Questions that can surface on Service Detail pages. Publish when the
        answer is ready; drafts stay internal.
      </p>
      <div className="mt-8">
        <FaqPanel />
      </div>
    </>
  );
}
