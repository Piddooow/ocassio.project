import type { MediaRef } from "@/lib/content/types";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";

interface ShowreelProps {
  /** Null until the media pipeline delivers a film (§31.23, poster-first). */
  src?: string | null;
  poster: MediaRef;
  title: string;
  caption?: string;
}

/**
 * Video & showreel (§31.23): poster first, play on interaction,
 * never autoplay with sound. Renders as a poster-only frame
 * until a real source exists.
 */
export function Showreel({ src, poster, title, caption }: ShowreelProps) {
  return (
    <figure>
      <div className="relative overflow-hidden">
        {src ? (
          <video
            controls
            controlsList="nodownload"
            preload="none"
            playsInline
            onContextMenu={(event) => event.preventDefault()}
            className="media-color-reveal aspect-[16/9] w-full bg-surface object-cover"
          >
            <source src={src} />
          </video>
        ) : (
          <MediaPlaceholder aspect={poster.aspect} label={poster.label} />
        )}
      </div>
      <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-body-sm text-secondary">{title}</span>
        {caption ? (
          <span className="text-caption text-muted">{caption}</span>
        ) : null}
      </figcaption>
    </figure>
  );
}
