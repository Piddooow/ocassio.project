import type { Metadata } from "next";
import { SettingsPanel } from "@/components/admin/SettingsPanel";

export const metadata: Metadata = { title: "Global Settings" };

/** Admin → Website → Global Settings (§10.3). */
export default function AdminSettingsPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Global Settings</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        The single source for studio identity, contact channels, socials,
        the default CTA, copyright, and default SEO. Only real values are
        shown publicly; unset fields fall back to labeled placeholders.
      </p>
      <div className="mt-8">
        <SettingsPanel />
      </div>
    </>
  );
}
