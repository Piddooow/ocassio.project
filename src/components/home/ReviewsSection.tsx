import { getFeaturedReviews } from "@/lib/content/reviews";
import { ReviewCard } from "@/components/work/ReviewCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup } from "@/components/ui/RevealGroup";

/**
 * Reviews on Home (studio request): four client notes, quiet and
 * editorial. Renders nothing while no reviews exist.
 */
export function ReviewsSection() {
  const reviews = getFeaturedReviews();
  if (reviews.length === 0) return null;

  return (
    <section
      data-section="reviews"
      className="border-t border-line py-16 lg:py-24"
    >
      <div className="container-editorial">
        <Reveal>
          <SectionHeader
            label="Reviews"
            title={
              <>
                What clients <em>say</em>
              </>
            }
          />
        </Reveal>
        <RevealGroup itemSelector="[data-review-card]" stagger={0.08}>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:gap-16">
            {reviews.map(({ projectSlug, review }) => (
              <ReviewCard key={projectSlug} review={review} />
            ))}
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}
