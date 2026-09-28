import { ButtonLink } from "@/components/ui/ButtonLink";
import { BrandLogo } from "@/components/site/BrandLogo";

/**
 * Journal-scoped not-found state: an article slug that is unknown, draft,
 * private, or removed lands here instead of the generic 404.
 */
export default function JournalNotFound() {
  return (
    <section className="container-editorial flex min-h-[70vh] flex-col justify-center pb-24 pt-32">
      <BrandLogo
        variant="mark"
        className="block"
        imgClassName="h-12 w-12 object-contain"
      />
      <p className="mt-8 text-label uppercase tracking-label-wide text-muted">
        Journal
      </p>
      <h1 className="mt-6 max-w-2xl font-display text-display-xl">
        This article is unavailable.
      </h1>
      <p className="mt-4 max-w-md text-body text-secondary">
        It may be unpublished, private, or the link may be outdated. The
        journal still has plenty to read.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <ButtonLink href="/journal" variant="primary">
          Back to Journal
        </ButtonLink>
        <ButtonLink href="/work" variant="secondary">
          View Work
        </ButtonLink>
      </div>
    </section>
  );
}
