import type { Metadata } from "next";
import { TeamPanel } from "@/components/admin/TeamPanel";

export const metadata: Metadata = { title: "Team" };

/** Admin → Studio → Team (§18). */
export default function AdminTeamPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Team</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        People and collaborators shown on About. Keep fictional faces out:
        while the list is empty the public page renders its labeled
        placeholder.
      </p>
      <div className="mt-8">
        <TeamPanel />
      </div>
    </>
  );
}
