import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicLegalPage } from "@/lib/db/queries/legal";
import { LegalPageView } from "@/components/legal/LegalPageView";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms that govern using the Ocassio.Project website and commissioning work.",
};

export const dynamic = "force-dynamic";

/** Terms of Use (§6.14), light, editorial legal page, served from the CMS. */
export default async function TermsPage() {
  const page = await getPublicLegalPage("terms");
  if (!page) notFound();

  return <LegalPageView page={page} eyebrow="Terms" />;
}
