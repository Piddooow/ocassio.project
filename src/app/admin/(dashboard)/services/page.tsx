import type { Metadata } from "next";
import { ServicesPanel } from "@/components/admin/ServicesPanel";

export const metadata: Metadata = { title: "Services" };

/** Admin → Services → Services (§14). */
export default function AdminServicesPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Services</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        The published offers with their details and selected work. The first
        project slug in Selected work becomes the cover.
      </p>
      <div className="mt-8">
        <ServicesPanel />
      </div>
    </>
  );
}
