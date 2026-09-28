import type { Metadata } from "next";
import { AccountPanel } from "@/components/admin/AccountPanel";

export const metadata: Metadata = { title: "Account" };

/** Admin → Account: self-service password (§27). */
export default function AdminAccountPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Account</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Rotate your own password. Other sessions of this account are signed
        out automatically after the change.
      </p>
      <div className="mt-8">
        <AccountPanel />
      </div>
    </>
  );
}
