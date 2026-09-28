import { ButtonLink } from "@/components/ui/ButtonLink";
import { SiteShell } from "@/components/site/SiteShell";
import { BrandLogo } from "@/components/site/BrandLogo";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="container-editorial flex min-h-[70vh] flex-col justify-center pb-24 pt-32">
        <BrandLogo
          variant="lockup"
          className="block"
          imgClassName="h-24 w-auto"
        />
        <p className="mt-8 text-label uppercase text-muted">404</p>
        <h1 className="mt-6 max-w-2xl font-display text-display-xl">
          This page could not be found.
        </h1>
        <p className="mt-4 max-w-md text-body text-secondary">
          The page you are looking for may have moved, or the link may be
          outdated.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/work" variant="primary">
            View Work
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Go Home
          </ButtonLink>
        </div>
      </section>
    </SiteShell>
  );
}
