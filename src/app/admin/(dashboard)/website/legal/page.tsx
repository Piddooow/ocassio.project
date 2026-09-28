import type { Metadata } from "next";
import { LegalEditor } from "@/components/admin/LegalEditor";

export const metadata: Metadata = {
  title: "Legal",
};

/** Admin → Website → Legal (§9.4). */
export default function AdminLegalPage() {
  return <LegalEditor />;
}
