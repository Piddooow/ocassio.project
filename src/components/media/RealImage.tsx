"use client";

import { useEffect, useRef, useState } from "react";
import {
  photoSrcSet,
  thumbnailVariant,
  type PhotoAsset,
} from "@/lib/content/media";
import { useInViewOnce } from "@/lib/use-in-view";
import { MediaSkeleton } from "./MediaSkeleton";

interface FadeImgProps {
  src: string | null;
  alt?: string;
  aspect?: string;
  loading?: "lazy" | "eager";
  className?: string;
  imgClassName?: string;
  /** Bottom-up theme gradient on the frame (default on, studio request). */
  fade?: boolean;
  children?: React.ReactNode;
}

/** Plain image (video posters, brand art) with the same fade-in discipline. */
export function FadeImg({
  src,
  alt = "",
  aspect = "16 / 9",
  loading = "lazy",
  className,
  imgClassName,
  fade = true,
  children,
}: FadeImgProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(frameRef);

  // Images can finish before hydration attaches onLoad, check on mount.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div
      ref={frameRef}
      className={`media-guard relative overflow-hidden bg-surface${className ? ` ${className}` : ""}`}
      style={{ aspectRatio: aspect }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 ease-out ${
            loaded ? "opacity-100" : "opacity-0"
          }${imgClassName ? ` ${imgClassName}` : ""}`}
        />
      ) : null}
      <span aria-hidden data-media-shield className="media-shield" />
      {src && !loaded && inView ? <MediaSkeleton /> : null}
      {fade ? <span aria-hidden data-media-fade className="media-fade" /> : null}
      {children}
    </div>
  );
}

interface RealImageProps {
  photo: PhotoAsset;
  /** Responsive sizes attribute, controls which variant the browser picks. */
  sizes: string;
  /** Wrapper classes (background tone + any hover scale on the image). */
  className?: string;
  imgClassName?: string;
  /** Force a fixed frame (e.g. "4 / 5") for uniform grids; default keeps ratio. */
  aspectOverride?: string;
  priority?: boolean;
  alt?: string;
  /** Bottom-up theme gradient on the frame (default on, studio request). */
  fade?: boolean;
}

/**
 * Real photo with pre-generated variants: srcset, lazy loading, fixed
 * aspect ratio (no layout shift) and a soft fade-in once decoded.
 */
export function RealImage({
  photo,
  sizes,
  className,
  imgClassName,
  aspectOverride,
  priority = false,
  alt = "",
  fade = true,
}: RealImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(frameRef);

  // Images can finish before hydration attaches onLoad, check on mount.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div
      ref={frameRef}
      className={`media-guard relative overflow-hidden bg-surface${className ? ` ${className}` : ""}`}
      style={{ aspectRatio: aspectOverride ?? `${photo.width} / ${photo.height}` }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <img
        ref={imgRef}
        src={thumbnailVariant(photo)}
        srcSet={photoSrcSet(photo)}
        sizes={sizes}
        width={photo.width}
        height={photo.height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-700 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        }${imgClassName ? ` ${imgClassName}` : ""}`}
      />
      <span aria-hidden data-media-shield className="media-shield" />
      {!loaded && inView ? <MediaSkeleton /> : null}
      {fade ? <span aria-hidden data-media-fade className="media-fade" /> : null}
    </div>
  );
}
