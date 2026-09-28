import Link from "next/link";
import { getReadingTime, type Article } from "@/lib/content/journal";
import { getJournalPhoto } from "@/lib/content/media";
import {
  ASPECT_RATIO,
  MediaPlaceholder,
} from "@/components/ui/MediaPlaceholder";
import { RealImage } from "@/components/media/RealImage";
import { formatArticleDate } from "@/lib/format";

interface JournalCardProps {
  article: Article;
}

const MEDIA_HOVER = "media-color-reveal";

/**
 * Journal card (§31.19): cover, category, title, publish date, reading time.
 * Editorial and minimal, one hover/focus effect on the media (the color
 * reveal) plus the title underline, with keyboard parity. Shipped stories
 * carry their real print; future articles keep the neutral placeholder.
 */
export function JournalCard({ article }: JournalCardProps) {
  const coverPhoto = article.coverPhotoId
    ? getJournalPhoto(article.coverPhotoId)
    : undefined;

  return (
    <article>
      <Link href={`/journal/${article.slug}`} className="group block">
        {coverPhoto ? (
          <RealImage
            photo={coverPhoto}
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
            aspectOverride={ASPECT_RATIO[article.cover.aspect]}
            className="border border-line"
            imgClassName={MEDIA_HOVER}
            alt={article.title}
          />
        ) : (
          <MediaPlaceholder
            aspect={article.cover.aspect}
            label={article.cover.label}
            mediaClassName={MEDIA_HOVER}
          />
        )}
        <p className="mt-4 text-label uppercase tracking-label-wide text-muted">
          {article.category}
        </p>
        <h3 className="mt-2 font-display text-display-sm underline-offset-4 group-hover:underline group-focus-visible:underline">
          {article.title}
        </h3>
        <p className="mt-1 text-caption text-muted">
          <time dateTime={article.publishDate}>
            {formatArticleDate(article.publishDate)}
          </time>
          {" · "}
          {getReadingTime(article)}
        </p>
      </Link>
    </article>
  );
}
