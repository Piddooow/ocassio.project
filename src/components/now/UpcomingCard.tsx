import Link from "next/link";
import type { UpcomingProject } from "@/lib/content/upcoming";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";

const STATUS_LABEL: Record<UpcomingProject["status"], string> = {
  in_production: "In Production",
  coming_soon: "Coming Soon",
};

interface UpcomingCardProps {
  entry: UpcomingProject;
  index: number;
  /** Resolved public project relation, absent when none is published. */
  relatedHref?: string;
}

/**
 * Now / Coming Soon entry (§6.11): media, quiet metadata, and, when a
 * published relation exists, a single hover affordance to the project.
 */
export function UpcomingCard({ entry, index, relatedHref }: UpcomingCardProps) {
  const inner = (
    <>
      <div className="lg:col-span-7">
        <MediaPlaceholder
          aspect={entry.cover.aspect}
          label={entry.cover.label}
          index={String(index + 1).padStart(2, "0")}
          mediaClassName={
            relatedHref
              ? "transition-transform duration-700 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
              : undefined
          }
        />
      </div>
      <div className="lg:col-span-5">
        <span className="inline-flex items-center rounded-pill border border-line-strong px-3 py-1 text-label uppercase tracking-label-wide text-secondary">
          {STATUS_LABEL[entry.status]}
        </span>
        <h2
          className={`mt-5 text-balance font-display text-display-md${
            relatedHref
              ? " transition-transform duration-500 ease-out group-hover:translate-x-1"
              : ""
          }`}
        >
          {entry.title}
        </h2>
        <p className="mt-2 text-caption text-muted">
          {entry.projectType}, {entry.location} · Expected{" "}
          {entry.expectedRelease}
        </p>
        <p className="mt-5 max-w-md text-body-sm text-secondary">
          {entry.teaser}
        </p>
        {relatedHref ? (
          <span className="mt-6 inline-flex items-center gap-2 text-button font-medium text-primary">
            View project
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </span>
        ) : null}
      </div>
    </>
  );

  const gridClass = "grid items-center gap-8 lg:grid-cols-12 lg:gap-12";

  if (relatedHref) {
    return (
      <article data-entry={entry.slug} className="now-entry">
        <Link href={relatedHref} className={`group ${gridClass}`}>
          {inner}
        </Link>
      </article>
    );
  }

  return (
    <article data-entry={entry.slug} className={`now-entry ${gridClass}`}>
      {inner}
    </article>
  );
}
