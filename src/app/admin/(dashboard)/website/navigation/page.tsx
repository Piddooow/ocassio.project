import type { Metadata } from "next";
import { NavigationPanel } from "@/components/admin/NavigationPanel";

export const metadata: Metadata = { title: "Navigation" };

/** Admin → Website → Navigation (§10.2). */
export default function AdminNavigationPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Navigation</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        The primary menu labels, destinations, order, and visibility. The
        Start a Project CTA is managed separately under Global Settings.
      </p>
      <div className="mt-8">
        <NavigationPanel />
      </div>
    </>
  );
}
