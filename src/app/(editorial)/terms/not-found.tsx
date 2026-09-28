import { LegalUnavailable } from "@/components/legal/LegalUnavailable";

/** Rendered when the Terms page is unpublished or missing (§13). */
export default function TermsNotFound() {
  return <LegalUnavailable label="Terms" />;
}
