import { LegalUnavailable } from "@/components/legal/LegalUnavailable";

/** Rendered when the Privacy page is unpublished or missing (§13). */
export default function PrivacyNotFound() {
  return <LegalUnavailable label="Privacy" />;
}
