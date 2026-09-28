import { ButtonLink } from "@/components/ui/ButtonLink";
import { BrandLogo } from "@/components/site/BrandLogo";

/**
 * Legal empty state: rendered when a legal page is unpublished or missing.
 * Unpublished wording is never shown (§13), the visitor gets a clear,
 * dated-safe status with real next actions instead of a bare 404.
 */
export function LegalUnavailable({ label }: { label: string }) {
  return (
    <section className="container-editorial flex min-h-[70vh] flex-col justify-center pb-24 pt-32">
      <BrandLogo
        variant="mark"
        className="block"
        imgClassName="h-12 w-12 object-contain"
      />
      <p className="mt-8 text-label uppercase tracking-label-wide text-muted">
        Legal · {label}
      </p>
      <h1 className="mt-6 max-w-2xl font-display text-display-xl">
        This document is being updated.
      </h1>
      <p className="mt-4 max-w-md text-body text-secondary">
        The {label.toLowerCase()} page is not available right now. It will be
        published here as soon as the wording is final.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <ButtonLink href="/" variant="primary">
          Back Home
        </ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Contact
        </ButtonLink>
      </div>
    </section>
  );
}
