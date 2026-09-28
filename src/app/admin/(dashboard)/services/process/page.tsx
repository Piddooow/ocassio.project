import type { Metadata } from "next";
import { ProcessPanel } from "@/components/admin/ProcessPanel";

export const metadata: Metadata = { title: "Process" };

/** Admin → Services → Process (§16). */
export default function AdminProcessPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Process</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        The engagement steps shown on the public Process page and the service
        detail preview. Hide keeps a step out of the public flow.
      </p>
      <div className="mt-8">
        <ProcessPanel />
      </div>
    </>
  );
}
