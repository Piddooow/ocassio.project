"use client";

import { useRef, type ReactNode } from "react";
import { useMediaReveal } from "@/lib/media-reveal";
import { cn } from "@/lib/utils";

interface MediaMasonryProps<T> {
  items: T[];
  getKey: (item: T) => string;
  /** Full visual for one item (frame, media, meta, hover treatment). The
   * frame owns its own aspect ratio, so heights vary and the columns pack. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Column classes; defaults to 1 / 2 / 3 across the breakpoints. */
  columnsClassName?: string;
  /** Direction items travel in from on first view. */
  animateFrom?: "bottom" | "top" | "left" | "right";
  className?: string;
  itemClassName?: string;
  label?: string;
}

/**
 * Masonry grid with the shared photograph entrance (see media-reveal).
 * CSS columns pack the varying-ratio frames; every item reveals exactly
 * once per item-set change, so a filter click re-reveals the new set and
 * scrolling never replays a card that already played.
 */
export function MediaMasonry<T>({
  items,
  getKey,
  renderItem,
  columnsClassName = "columns-1 sm:columns-2 lg:columns-3",
  animateFrom = "bottom",
  className,
  itemClassName,
  label,
}: MediaMasonryProps<T>) {
  const scope = useRef<HTMLDivElement>(null);

  useMediaReveal(scope, {
    dependencies: [items],
    from: animateFrom,
    selector: "[data-masonry-item]",
  });

  return (
    <div
      ref={scope}
      data-masonry
      aria-label={label}
      className={cn(columnsClassName, className)}
    >
      {items.map((item, index) => (
        <div
          key={getKey(item)}
          data-masonry-item
          className={cn("mb-6 break-inside-avoid lg:mb-8", itemClassName)}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
