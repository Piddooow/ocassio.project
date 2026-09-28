"use client";

import { useMemo, useState } from "react";
import {
  formatDuration,
  type PhotoAsset,
  type VideoAsset,
} from "@/lib/content/media";
import { RealImage, FadeImg } from "./RealImage";
import { MediaMasonry } from "./media-masonry";
import { FilmTheater } from "./FilmPlayer";
import { PhotoViewer } from "./PhotoViewer";

interface ProjectMediaProps {
  photos: PhotoAsset[];
  videos: VideoAsset[];
  projectTitle: string;
  /** Formatted project date ("26 Jul 2026") for the item labels. */
  projectDate: string;
  className?: string;
}

type GalleryItem =
  | { kind: "photo"; photo: PhotoAsset; index: number }
  | { kind: "video"; video: VideoAsset; index: number };

/**
 * Project media section (studio request): photographs and film posters
 * pack into a masonry grid at their own ratios. Media rests in black and
 * white and hands the color back on hover; clicking a photograph opens
 * the full viewer, clicking a film opens the theater.
 */
export function ProjectMedia({
  photos,
  videos,
  projectTitle,
  projectDate,
  className,
}: ProjectMediaProps) {
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [filmIndex, setFilmIndex] = useState<number | null>(null);

  const items = useMemo<GalleryItem[]>(
    () => [
      ...photos.map((photo, index) => ({
        kind: "photo" as const,
        photo,
        index,
      })),
      ...videos.map((video, index) => ({
        kind: "video" as const,
        video,
        index,
      })),
    ],
    [photos, videos],
  );

  return (
    <>
      <div data-project-media className={className}>
        <div className="container-editorial">
          <MediaMasonry
            items={items}
            label={`${projectTitle}, photographs and films`}
            getKey={(item) =>
              item.kind === "photo"
                ? `photo-${item.photo.id}`
                : `video-${item.video.id}`
            }
            renderItem={(item) =>
              item.kind === "photo" ? (
                <button
                  type="button"
                  data-gallery-item
                  onClick={() => setPhotoIndex(item.index)}
                  aria-label={`Open photograph ${item.index + 1} of ${photos.length}`}
                  className="group block w-full cursor-zoom-in text-left"
                >
                  <RealImage
                    photo={item.photo}
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
                    imgClassName="media-color-reveal"
                    alt={`${projectTitle}, photograph ${item.index + 1}`}
                  />
                </button>
              ) : item.video.poster ? (
                <button
                  type="button"
                  data-gallery-item
                  onClick={() => setFilmIndex(item.index)}
                  aria-label={`Play ${item.video.title}`}
                  className="group block w-full text-left"
                >
                  <FadeImg
                    src={item.video.poster}
                    aspect="16 / 9"
                    imgClassName="media-color-reveal"
                    alt={`${item.video.title}, poster`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cta text-cta-foreground">
                        ▶
                      </span>
                    </span>
                    {item.video.durationSeconds ? (
                      <span className="absolute right-4 bottom-4 rounded-pill bg-background-deep/85 px-3 py-1 text-label uppercase tracking-label-wide text-primary">
                        {formatDuration(item.video.durationSeconds)}
                      </span>
                    ) : null}
                  </FadeImg>
                  <span className="mt-3 block text-caption text-muted">
                    {item.video.title} · {projectDate}
                  </span>
                </button>
              ) : null
            }
          />
        </div>
      </div>
      {photoIndex !== null ? (
        <PhotoViewer
          photos={photos}
          index={photoIndex}
          onIndex={setPhotoIndex}
          onClose={() => setPhotoIndex(null)}
          label={`${projectTitle}, photographs`}
        />
      ) : null}
      {filmIndex !== null ? (
        <FilmTheater
          videos={videos}
          initialIndex={filmIndex}
          onClose={() => setFilmIndex(null)}
        />
      ) : null}
    </>
  );
}
