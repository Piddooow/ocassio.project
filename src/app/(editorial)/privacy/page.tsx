import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicLegalPage } from "@/lib/db/queries/legal";
import { LegalPageView } from "@/components/legal/LegalPageView";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Ocassio.Project collects, uses, and protects personal information.",
};

export const dynamic = "force-dynamic";

/** Privacy Policy (§6.14), light, editorial legal page, served from the CMS. */
export default async function PrivacyPage() {
  const page = await getPublicLegalPage("privacy");
  if (!page) notFound();

  return <LegalPageView page={page} eyebrow="Privacy" />;
}
