import type { Metadata } from "next";
import { VersionsPanel } from "@/components/admin/VersionsPanel";

export const metadata: Metadata = { title: "Versions" };

/** Admin → Publishing → Versions (§25). */
export default function AdminVersionsPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Versions</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Every save appends a snapshot. View a version, compare it with the
        previous one, and restore it (restores append a new version, so the
        log always stays append-only).
      </p>
      <div className="mt-8">
        <VersionsPanel />
      </div>
    </>
  );
}
