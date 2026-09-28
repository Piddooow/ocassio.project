import Link from "next/link";
import type { Project } from "@/lib/content/types";
import { formatDuration } from "@/lib/content/media";
import { formatArticleDate } from "@/lib/format";
import { RealImage, FadeImg } from "@/components/media/RealImage";
import { WeddingMark } from "@/components/media/FilmPlayer";
import { MediaHoverPreview } from "@/components/media/MediaHoverPreview";

interface ProjectCardProps {
  project: Project;
  /** Optional editorial numbering, omit where numbering has no meaning. */
  index?: number;
  /** Uniform frame across a grid (keeps rows even, no empty voids). */
  frameAspect?: string;
}

/**
 * Project card (§31.16): media first, quiet metadata.
 * Photo projects show their lead photograph; film projects show the
 * lead video poster with a play cue. One hover/focus effect only.
 */
export function ProjectCard({ project, index, frameAspect }: ProjectCardProps) {
  const indexLabel =
    typeof index === "number" ? String(index + 1).padStart(2, "0") : undefined;
  const cover = project.photos[0] ?? null;
  const film = project.videos[0] ?? null;
  const countLabel = cover
    ? `${project.photos.length} ${project.photos.length === 1 ? "photograph" : "photographs"}`
    : `${project.videos.length} ${project.videos.length === 1 ? "film" : "films"}`;

  return (
    <article data-work-card>
      <Link href={`/work/${project.slug}`} className="group block">
        <div className="relative overflow-hidden">
          {cover ? (
            <RealImage
              photo={cover}
              sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
              aspectOverride={frameAspect}
              imgClassName="media-color-reveal"
            />
          ) : (
            <FadeImg
              src={film?.poster ?? null}
              aspect={frameAspect ?? "16 / 9"}
              imgClassName="media-color-reveal"
            >
              {film ? (
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cta text-cta-foreground">
                    ▶
                  </span>
                </span>
              ) : null}
              {film?.wedding ? <WeddingMark /> : null}
              {film?.durationSeconds ? (
                <span className="absolute bottom-4 right-4 rounded-pill bg-background-deep/85 px-3 py-1 text-label uppercase tracking-label-wide text-primary">
                  {formatDuration(film.durationSeconds)}
                </span>
              ) : null}
            </FadeImg>
          )}

          {indexLabel ? (
            <span
              aria-hidden
              className="pointer-events-none absolute left-4 top-4 text-label tabular-nums tracking-label-wide text-primary/70 mix-blend-difference"
            >
              {indexLabel}
            </span>
          ) : null}

          <MediaHoverPreview
            eyebrow={`${project.category} · ${countLabel}`}
            title={project.title}
            meta={formatArticleDate(project.date)}
            className="pr-28"
          />

          <span
            aria-hidden
            className="pointer-events-none absolute bottom-4 right-4 inline-flex h-9 translate-y-2 items-center rounded-pill bg-cta px-4 text-label font-semibold uppercase text-cta-foreground opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
          >
            View Project →
          </span>
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-4">
          <h3 className="font-display text-display-sm">{project.title}</h3>
          <span className="text-caption tabular-nums text-muted">
            {project.year}
          </span>
        </div>
        <p className="mt-1 text-caption text-muted">
          {project.category} · {countLabel}
        </p>
      </Link>
    </article>
  );
}
