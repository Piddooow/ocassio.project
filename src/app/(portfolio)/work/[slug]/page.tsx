import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNextProject, getPublishedProjectBySlug, getPublishedProjects, getRelatedProjects } from "@/lib/content/queries";
import { getReviewsForProject } from "@/lib/content/reviews";
import { formatArticleDate } from "@/lib/format";
import { InlineText } from "@/components/content/InlineText";
import { RealImage } from "@/components/media/RealImage";
import { FilmList, FilmPoster } from "@/components/media/FilmPlayer";
import { ProjectMedia } from "@/components/media/ProjectMedia";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LikeButton } from "@/components/ui/LikeButton";
import { ReviewCard } from "@/components/work/ReviewCard";
import { Reveal } from "@/components/motion/Reveal";
import { ProjectGrid } from "@/components/work/ProjectGrid";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const projects = await getPublishedProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) return { title: "Project not found" };
  return { title: project.title, description: project.shortDescription };
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label uppercase tracking-label-wide text-muted">
        {label}
      </dt>
      <dd className="mt-2 text-body-sm text-secondary">{value}</dd>
    </div>
  );
}

/**
 * Project Detail (§6.3), dark, visual case study.
 * Photo projects carry their full photo wall; film projects carry every
 * cut of the film. Nothing is hidden behind third parties.
 */
export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) notFound();

  const [related, next] = await Promise.all([
    getRelatedProjects(project),
    getNextProject(project.slug),
  ]);

  const heroPhoto = project.photos[0] ?? null;
  /** The hero already carries the lead frame; the wall starts at the second. */
  const galleryPhotos = project.photos.slice(1);
  /** Cuts ordered short-to-long: teaser first, full film last. */
  const films = [...project.videos].sort(
    (a, b) => (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0),
  );
  const heroFilm = films[0] ?? null;
  const creditRows = project.credits.filter(
    (credit) => credit.name.trim().length > 0,
  );
  const mediaSummary = heroPhoto
    ? `${project.photos.length} ${project.photos.length === 1 ? "photograph" : "photographs"}`
    : `${project.videos.length} ${project.videos.length === 1 ? "film" : "films"}`;
  const reviews = getReviewsForProject(project.slug);

  return (
    <>
      <section data-section="hero" className="pt-6">
        <Reveal variant="media">
          <div className="container-editorial">
            {heroPhoto ? (
              <RealImage
                photo={heroPhoto}
                sizes="(max-width: 1200px) 100vw, 1200px"
                priority
                imgClassName="media-color-reveal"
                alt={`${project.title}, lead photograph`}
              />
            ) : heroFilm ? (
              <FilmPoster video={heroFilm} large />
            ) : null}
          </div>
        </Reveal>
      </section>

      <section
        data-section="information"
        className="container-editorial pb-6 pt-14 lg:pt-20"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            {project.category}
          </p>
          <h1 className="mt-4 font-display text-display-xl">{project.title}</h1>
          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4">
            <InfoItem label="Date" value={formatArticleDate(project.date)} />
            <InfoItem label="Category" value={project.category} />
            <InfoItem label="Media" value={mediaSummary} />
            {project.client ? (
              <InfoItem label="Client" value={project.client} />
            ) : null}
          </dl>
        </Reveal>
      </section>

      <section
        data-section="content"
        className="container-editorial pb-6 pt-6"
      >
        <Reveal>
          <p className="mx-auto max-w-2xl text-body text-secondary">
            <InlineText value={project.shortDescription} />
          </p>
        </Reveal>
      </section>

      <section data-section="like" className="container-editorial pb-14 pt-2">
        <Reveal>
          <div className="flex items-center justify-center">
            <LikeButton entity="project" slug={project.slug} />
          </div>
        </Reveal>
      </section>

      {reviews.length > 0 ? (
        <section
          data-section="reviews"
          className="container-editorial border-t border-line py-14 lg:py-20"
        >
          <Reveal>
            <SectionHeader
              label="Reviews"
              title={
                <>
                  Notes from the <em>clients</em>
                </>
              }
            />
          </Reveal>
          <Reveal>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:gap-16">
              {reviews.map((review) => (
                <ReviewCard
                  key={`${review.author}-${review.role}`}
                  review={review}
                />
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      {project.photos.length > 0 &&
      (galleryPhotos.length > 0 || films.length > 0) ? (
        <section data-section="gallery" className="pb-16 lg:pb-24">
          <Reveal>
            <div className="container-editorial mb-8 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-display-md">Photographs</h2>
              <p className="text-caption text-muted">
                {project.photos.length}{" "}
                {project.photos.length === 1 ? "photograph" : "photographs"}
                {films.length > 0
                  ? ` · ${films.length} ${films.length === 1 ? "film" : "films"}`
                  : ""}
              </p>
            </div>
          </Reveal>
          <ProjectMedia
            photos={galleryPhotos}
            videos={films}
            projectTitle={project.title}
            projectDate={formatArticleDate(project.date)}
          />
        </section>
      ) : null}

      {films.length > 0 && project.photos.length === 0 ? (
        <section
          data-section="films"
          className="container-editorial border-t border-line py-16 lg:py-24"
        >
          <SectionHeader
            label="Films"
            title={
              <>
                Every <em>cut</em>
              </>
            }
          />
          <div className="mt-10">
            <FilmList
              videos={films}
              previewTitle={project.title}
              previewMeta={formatArticleDate(project.date)}
            />
          </div>
        </section>
      ) : null}

      {creditRows.length > 0 ? (
        <section
          data-section="credits"
          className="container-editorial py-14 lg:py-20"
        >
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-24">
            <h2 className="font-display text-display-md">Credits</h2>
            <dl className="flex flex-col">
              {creditRows.map((credit) => (
                <div
                  key={credit.role}
                  className="flex items-baseline justify-between gap-6 border-b border-line py-4 last:border-0"
                >
                  <dt className="text-label uppercase tracking-label-wide text-muted">
                    {credit.role}
                  </dt>
                  <dd className="text-body-sm text-secondary">
                    {credit.name}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section
          data-section="related"
          className="container-editorial border-t border-line py-16 lg:py-24"
        >
          <SectionHeader
            label="Related Projects"
            title={
              <>
                More from the <em>archive</em>
              </>
            }
          />
          <ProjectGrid projects={related} className="mt-12" />
        </section>
      ) : null}

      {next ? (
        <section data-section="next" className="border-t border-line">
          <Link href={`/work/${next.slug}`} className="group block">
            <div className="container-editorial py-16 lg:py-24">
              <p className="text-label uppercase tracking-label-wide text-muted">
                Next Project
              </p>
              <div className="mt-4 flex items-center justify-between gap-8">
                <h2 className="font-display text-display-lg transition-transform duration-500 ease-out group-hover:translate-x-1">
                  {next.title}
                </h2>
                <span
                  aria-hidden
                  className="text-display-md transition-transform duration-500 ease-out group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </div>
          </Link>
        </section>
      ) : null}
    </>
  );
}
