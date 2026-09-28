"use client";

import { cn } from "@/lib/utils";

interface MediaSkeletonProps {
  className?: string;
}

/**
 * Loading placeholder for media frames (studio request): a full-frame
 * bone with a slow shimmer sweep, shown only while a photo, poster or
 * film is still loading. The sweep is a composited transform and the
 * global reduced-motion rules freeze it for users who ask.
 */
export function MediaSkeleton({ className }: MediaSkeletonProps) {
  return (
    <span
      aria-hidden
      data-media-skeleton
      className={cn(
        "skeleton-bone pointer-events-none absolute inset-0",
        className,
      )}
    />
  );
}
