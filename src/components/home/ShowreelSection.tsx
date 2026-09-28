import Link from "next/link";
import { getFeaturedFilm } from "@/lib/content/projects";
import { HOME_SHOWREEL } from "@/lib/content/home";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FilmPoster } from "@/components/media/FilmPlayer";
import { Reveal } from "@/components/motion/Reveal";

/** 06 Showreel, dark, film-first (§31.14). One selected film (§6.1). */
export function ShowreelSection() {
  const featured = getFeaturedFilm();

  return (
    <section
      data-section="showreel"
      className="text-primary"
    >
      <div className="container-editorial py-20 lg:py-28">
        <SectionHeader
          label={HOME_SHOWREEL.label}
          title={
            <>
              Film, <em>first</em>
            </>
          }
          action={
            featured
              ? {
                  label: "All films",
                  href: `/work/${featured.project.slug}`,
                }
              : undefined
          }
        />
        {featured ? (
          <Reveal variant="media" className="mt-12">
            <FilmPoster
              video={featured.project.videos[featured.videoIndex]}
              large
            />
            <p className="mt-4 text-caption text-muted">
              {featured.project.title}, {HOME_SHOWREEL.caption}.{" "}
              <Link
                href={`/work/${featured.project.slug}`}
                className="text-secondary underline underline-offset-4 transition-colors duration-300 hover:text-primary"
              >
                See all {featured.project.videos.length} cuts
              </Link>
              .
            </p>
          </Reveal>
        ) : (
          <p className="mt-12 max-w-xl text-body text-secondary">
            Films are being prepared for the next release, check the portfolio
            for the latest work.
          </p>
        )}
      </div>
    </section>
  );
}
