import type { Metadata } from "next";
import { HomepagePanel } from "@/components/admin/HomepagePanel";

export const metadata: Metadata = {
  title: "Homepage",
};

/** Admin → Website → Homepage (§10.1). */
export default function AdminHomepagePage() {
  return <HomepagePanel />;
}
