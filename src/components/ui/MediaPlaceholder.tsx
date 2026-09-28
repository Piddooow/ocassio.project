import type { MediaAspect } from "@/lib/content/types";

const ASPECT_CLASS: Record<MediaAspect, string> = {
  portrait: "aspect-[4/5]",
  landscape: "aspect-[3/2]",
  cinematic: "aspect-[16/9]",
  square: "aspect-square",
};

/** Media aspect token -> CSS aspect-ratio value (shared with real covers). */
export const ASPECT_RATIO: Record<MediaAspect, string> = {
  portrait: "4 / 5",
  landscape: "3 / 2",
  cinematic: "16 / 9",
  square: "1 / 1",
};

interface MediaPlaceholderProps {
  aspect?: MediaAspect;
  /** Small editorial caption rendered inside the frame. */
  label?: string;
  /** Index numeral rendered as a quiet watermark. */
  index?: string;
  className?: string;
  /**
   * Extra classes for the inner media layer only (e.g. hover scale),
   * so frame chrome like the caption stays still while the media moves.
   */
  mediaClassName?: string;
}

/**
 * Neutral tonal stand-in for photography/video until the media pipeline
 * serves real assets (§21). Stays inside the locked palette.
 */
export function MediaPlaceholder({
  aspect = "portrait",
  label,
  index,
  className,
  mediaClassName,
}: MediaPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label ? `Media placeholder: ${label}` : "Media placeholder"}
      className={`relative overflow-hidden border border-line ${ASPECT_CLASS[aspect]}${className ? ` ${className}` : ""}`}
    >
      <div
        aria-hidden
        className={`absolute inset-0 bg-surface${mediaClassName ? ` ${mediaClassName}` : ""}`}
      >
        {index ? (
          <span className="absolute inset-0 flex items-center justify-center font-display text-[clamp(4rem,12vw,8rem)] leading-none text-primary/10">
            {index}
          </span>
        ) : null}
      </div>
      {label ? (
        <span
          aria-hidden
          className="absolute bottom-4 left-4 text-label uppercase tracking-label-wide text-muted"
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
