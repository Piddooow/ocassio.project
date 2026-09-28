import type { Metadata } from "next";
import { PricingPanel } from "@/components/admin/PricingPanel";

export const metadata: Metadata = { title: "Pricing" };

/** Admin → Services → Pricing (§15). */
export default function AdminPricingPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Pricing</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Editorial packages per service. Custom quotes keep the amount empty;
        Fixed and Starting From entries require one (§6.6).
      </p>
      <div className="mt-8">
        <PricingPanel />
      </div>
    </>
  );
}
