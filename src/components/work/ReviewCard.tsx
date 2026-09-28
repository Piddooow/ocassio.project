import type { ProjectReview } from "@/lib/content/reviews";

/**
 * Client note card (studio request): initials chip, name, context, and
 * the message. No fabricated portraits, quiet editorial framing.
 */
export function ReviewCard({ review }: { review: ProjectReview }) {
  return (
    <figure
      data-review-card
      className="flex h-full flex-col justify-between gap-6 border-t border-line pt-6"
    >
      <blockquote className="text-body text-secondary">
        {review.message}
      </blockquote>
      <figcaption className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-label font-semibold uppercase tracking-label-wide text-secondary"
        >
          {review.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body-sm font-medium text-primary">
            {review.author}
          </span>
          <span className="block text-caption text-muted">{review.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
