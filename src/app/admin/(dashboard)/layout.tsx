import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { USER_ROLE_LABEL } from "@/lib/auth/users";

/**
 * Every Admin CMS screen requires a signed-in user (§27). Module-level
 * role enforcement stays on the backend APIs; this gate only keeps
 * signed-out visitors on the sign-in screen.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSessionUser();
  if (!user) redirect("/admin/sign-in");

  return (
    <AdminShell
      user={{
        name: user.name,
        roleLabel: USER_ROLE_LABEL[user.role],
        role: user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
