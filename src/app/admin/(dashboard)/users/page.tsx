import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { UsersPanel } from "@/components/admin/UsersPanel";

export const metadata: Metadata = { title: "Users & Roles" };

/**
 * Users & Roles (§8, §27): owner-only screen. The backend enforces the
 * same rule, so a redirect here is only about clarity.
 */
export default async function AdminUsersPage() {
  const user = await getServerSessionUser();
  if (!user || user.role !== "owner") redirect("/admin");

  return (
    <>
      <h1 className="font-display text-display-sm">Users &amp; Roles</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Owners manage who can enter the CMS and what each role may do
        (§27). Sessions last seven days; disabling an account cuts access
        on the next request.
      </p>
      <div className="mt-8">
        <UsersPanel />
      </div>
    </>
  );
}
