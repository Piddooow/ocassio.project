import Link from "next/link";
import type { Service } from "@/lib/content/services";
import type { Project } from "@/lib/content/types";
import { RealImage, FadeImg } from "@/components/media/RealImage";

interface ServiceCardProps {
  service: Service;
  coverProject?: Project;
  /** Editorial numbering, matching the Work and pricing lists. */
  index?: number;
  /** Titles of related real projects (§6.4 Related Projects). */
  relatedTitles?: string[];
}

/** Service card (§31.18): name, short description, optional cover, quote cue. */
export function ServiceCard({
  service,
  coverProject,
  index,
  relatedTitles = [],
}: ServiceCardProps) {
  const coverPhoto = coverProject?.photos[0] ?? null;
  const coverFilm = coverProject?.videos[0] ?? null;
  const indexLabel =
    typeof index === "number" ? String(index + 1).padStart(2, "0") : undefined;

  return (
    <article data-service-card={service.slug}>
      <Link href={`/services/${service.slug}`} className="group block">
        <div className="relative overflow-hidden">
          {coverPhoto ? (
            <RealImage
              photo={coverPhoto}
              sizes="(max-width: 1024px) 100vw, 560px"
              aspectOverride="3 / 2"
              imgClassName="media-color-reveal"
            />
          ) : coverFilm?.poster ? (
            <FadeImg
              src={coverFilm.poster}
              imgClassName="media-color-reveal"
            />
          ) : (
            <div
              aria-hidden
              className="flex aspect-[3/2] items-center justify-center border border-line bg-background-alt"
            >
              <span className="font-display text-display-md text-muted">
                {service.name}
              </span>
            </div>
          )}
          {indexLabel ? (
            <span
              aria-hidden
              className="pointer-events-none absolute left-4 top-4 text-label tabular-nums tracking-label-wide text-primary/70 mix-blend-difference"
            >
              {indexLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-display-sm underline-offset-4 group-hover:underline group-focus-visible:underline">
            {service.name}
          </h2>
          <span className="text-caption text-muted">
            {service.startingPrice ?? "Quote on request"}
          </span>
        </div>
        <p className="mt-2 max-w-md text-body-sm text-secondary">
          {service.shortDescription}
        </p>
      </Link>
      {relatedTitles.length > 0 ? (
        <p className="mt-3 text-caption text-muted">
          Related work: {relatedTitles.join(" · ")}
        </p>
      ) : null}
    </article>
  );
}
