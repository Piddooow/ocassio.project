interface MediaHoverPreviewProps {
  /** Small top line: "Photograph 03", film title, category. */
  eyebrow: string;
  /** The project name (display serif). */
  title: string;
  /** Date and year line: "26 Jul 2026". */
  meta: string;
  className?: string;
}

/**
 * Hover/focus preview over media (studio request): eyebrow, project name
 * and date slide up over the frame gradient. Pure CSS transition, so it
 * costs nothing while idle and respects reduced motion.
 */
export function MediaHoverPreview({
  eyebrow,
  title,
  meta,
  className,
}: MediaHoverPreviewProps) {
  return (
    <span
      aria-hidden
      data-media-preview
      className={`pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-3 flex-col gap-1 px-4 pb-4 opacity-0 transition-[opacity,transform] duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100${
        className ? ` ${className}` : ""
      }`}
    >
      <span className="text-label uppercase tracking-label-wide text-muted">
        {eyebrow}
      </span>
      <span className="font-display text-title-sm text-primary">{title}</span>
      <span className="text-caption text-secondary">{meta}</span>
    </span>
  );
}
