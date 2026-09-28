import type { Metadata } from "next";
import { AboutPanel } from "@/components/admin/AboutPanel";

export const metadata: Metadata = { title: "About" };

/** Admin → Studio → About (§18, §6.8). */
export default function AdminAboutPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">About</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        The studio story: heading, prose, and the philosophy lines. Every save
        records a version that can be restored later.
      </p>
      <div className="mt-8">
        <AboutPanel />
      </div>
    </>
  );
}
