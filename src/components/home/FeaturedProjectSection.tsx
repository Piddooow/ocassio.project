import Link from "next/link";
import type { Project } from "@/lib/content/types";
import { RealImage, FadeImg } from "@/components/media/RealImage";
import { Reveal } from "@/components/motion/Reveal";
import { FilmPoster } from "@/components/media/FilmPlayer";

interface FeaturedProjectSectionProps {
  project: Project;
}

/** 04 Featured Project, dark, one project with strong visual emphasis. */
export function FeaturedProjectSection({
  project,
}: FeaturedProjectSectionProps) {
  const cover = project.photos[0] ?? null;
  const film = project.videos[0] ?? null;
  const countLabel = cover
    ? `${project.photos.length} ${project.photos.length === 1 ? "photograph" : "photographs"}`
    : `${project.videos.length} ${project.videos.length === 1 ? "film" : "films"}`;

  return (
    <section
      data-section="featured-project"
      className="text-primary"
    >
      <div className="container-editorial pb-6 pt-20 lg:pb-8 lg:pt-28">
        <p className="text-label uppercase tracking-label-wide text-muted">
          Featured Project
        </p>
      </div>

      <Reveal variant="media">
        <div className="container-editorial">
          {film && !cover ? (
            <FilmPoster video={film} large />
          ) : (
            <Link href={`/work/${project.slug}`} className="group block">
              <div className="relative overflow-hidden">
                {cover ? (
                  <RealImage
                    photo={cover}
                    sizes="(max-width: 1200px) 100vw, 1200px"
                    imgClassName="media-color-reveal"
                  />
                ) : (
                  <FadeImg src={null} />
                )}
                <div className="absolute inset-x-0 bottom-0">
                  <div className="flex flex-wrap items-end justify-between gap-6 px-5 pb-8 pt-16 sm:px-8 lg:px-12 lg:pb-12">
                    <div>
                      <h3 className="font-display text-display-lg">
                        {project.title}
                      </h3>
                      <p className="mt-3 text-caption text-muted">
                        {project.category} · {countLabel} · {project.year}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="inline-flex h-11 items-center rounded-pill bg-cta px-5 text-button font-medium text-cta-foreground opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      View Project →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </Reveal>
    </section>
  );
}
