import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getWiredArticleBySlug,
  getWiredRelatedArticles,
} from "@/lib/content/live";
import { getArticleSeo } from "@/lib/db/queries/seo";
import { getReadingTime } from "@/lib/content/journal";
import { getJournalPhoto } from "@/lib/content/media";
import { getPublishedProjects } from "@/lib/content/queries";
import { formatArticleDate } from "@/lib/format";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { RealImage } from "@/components/media/RealImage";
import { LikeButton } from "@/components/ui/LikeButton";
import { Reveal } from "@/components/motion/Reveal";
import { ArticleBody } from "@/components/journal/ArticleBody";
import { JournalCard } from "@/components/journal/JournalCard";
import { StartCTA } from "@/components/site/StartCTA";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const [article, seo] = await Promise.all([
    getWiredArticleBySlug(slug),
    getArticleSeo(slug),
  ]);
  if (!article) return { title: "Article not found" };
  return {
    title: seo?.seoMetaTitle ?? article.title,
    description: seo?.seoMetaDescription ?? article.excerpt,
    ...(seo?.ogImage ? { openGraph: { images: [seo.ogImage] } } : {}),
  };
}

/**
 * Article Detail (§6.10), light, editorial, served from the CMS:
 * title → category + date → cover → article → related project →
 * related articles → start a project.
 */
export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getWiredArticleBySlug(slug);
  if (!article) notFound();

  const [projects, relatedArticles] = await Promise.all([
    getPublishedProjects(),
    getWiredRelatedArticles(slug, 3),
  ]);
  const referenceProjects = new Map(
    projects.map((project) => [project.slug, project]),
  );
  const relatedProject = article.relatedProjectSlug
    ? referenceProjects.get(article.relatedProjectSlug)
    : undefined;
  const coverPhoto = article.coverPhotoId
    ? getJournalPhoto(article.coverPhotoId)
    : undefined;

  return (
    <>
      <section
        data-section="article"
        className="container-editorial pb-10 pt-20 lg:pb-14 lg:pt-28"
      >
        <Reveal>
          <p className="text-label uppercase tracking-label-wide text-muted">
            {article.category} ·{" "}
            <time dateTime={article.publishDate}>
              {formatArticleDate(article.publishDate)}
            </time>{" "}
            · {getReadingTime(article)}
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-display-xl">
            {article.title}
          </h1>
          <div className="mt-8">
            <LikeButton entity="article" slug={article.slug} />
          </div>
        </Reveal>
      </section>

      <section data-section="cover">
        <Reveal variant="media">
          <div className="container-editorial">
            {coverPhoto ? (
              <RealImage
                photo={coverPhoto}
                sizes="(max-width: 1200px) 100vw, 1200px"
                aspectOverride="3 / 2"
                imgClassName="media-color-reveal"
                alt={`${article.title}, journal cover`}
              />
            ) : (
              <MediaPlaceholder
                aspect={article.cover.aspect}
                label={article.cover.label}
              />
            )}
          </div>
        </Reveal>
      </section>

      <section data-section="body" className="container-editorial py-14 lg:py-20">
        <ArticleBody
          blocks={article.blocks}
          referenceProjects={referenceProjects}
        />
      </section>

      {relatedProject ? (
        <section
          data-section="related-project"
          className="container-editorial pb-14 lg:pb-20"
        >
          <Link
            href={`/work/${relatedProject.slug}`}
            className="group flex flex-wrap items-center justify-between gap-6 border-y border-line py-8"
          >
            <div>
              <p className="text-label uppercase tracking-label-wide text-muted">
                Related Project
              </p>
              <p className="mt-2 font-display text-display-md transition-transform duration-500 ease-out group-hover:translate-x-1">
                {relatedProject.title}
              </p>
            </div>
            <span className="text-button font-medium text-primary">
              View project →
            </span>
          </Link>
        </section>
      ) : null}

      {relatedArticles.length > 0 ? (
        <section
          data-section="related-articles"
          className="container-editorial border-t border-line py-16 lg:py-24"
        >
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <h2 className="font-display text-display-lg">
                Related articles
              </h2>
              <Link
                href="/journal"
                className="group inline-flex min-h-11 items-center gap-2 text-button font-medium text-primary transition-colors duration-300 hover:opacity-70"
              >
                All articles
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((related) => (
                <div key={related.slug} className="journal-item">
                  <JournalCard article={related} />
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      <StartCTA />
    </>
  );
}
