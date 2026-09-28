import { redirect } from "next/navigation";

/** The Dashboard screen arrives with its own task; start at Homepage. */
export default function AdminIndexPage() {
  redirect("/admin/website/homepage");
}
