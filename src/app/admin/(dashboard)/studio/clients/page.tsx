import type { Metadata } from "next";
import { ClientsPanel } from "@/components/admin/ClientsPanel";

export const metadata: Metadata = { title: "Clients" };

/** Admin → Studio → Clients (§18). */
export default function AdminClientsPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Clients</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Selected clients. Featured clients surface on Home and About once
        published.
      </p>
      <div className="mt-8">
        <ClientsPanel />
      </div>
    </>
  );
}
