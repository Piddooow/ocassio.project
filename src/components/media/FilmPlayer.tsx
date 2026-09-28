"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap, useGSAP } from "@/lib/gsap";
import { DURATION, EASE, prefersReducedMotion } from "@/lib/motion";
import { formatDuration, type VideoAsset } from "@/lib/content/media";
import { FadeImg } from "./RealImage";
import { MediaHoverPreview } from "./MediaHoverPreview";
import { MediaSkeleton } from "./MediaSkeleton";
import { RevealGroup } from "@/components/ui/RevealGroup";

function PlayBadge({ large = false }: { large?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center rounded-full bg-cta text-cta-foreground transition-transform duration-500 ease-out group-hover:scale-105 group-focus-visible:scale-105 ${
        large ? "h-16 w-16" : "h-12 w-12"
      }`}
    >
      <span className={large ? "text-title-md" : "text-title-sm"}>▶</span>
    </span>
  );
}

export function WeddingMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/the-wedding-of.png"
      alt=""
      aria-hidden
      draggable={false}
      className="absolute bottom-4 left-4 h-5 w-auto opacity-90 mix-blend-difference"
    />
  );
}

interface TheaterProps {
  videos: VideoAsset[];
  initialIndex: number;
  onClose: () => void;
}

/** Full-screen film theater: poster-first, plays on open, Esc to close. */
export function FilmTheater({ videos, initialIndex, onClose }: TheaterProps) {
  const [index, setIndex] = useState(initialIndex);
  const [buffering, setBuffering] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const video = videos[index];

  // Each cut starts buffering again, and the skeleton fades out on play.
  useEffect(() => {
    setBuffering(true);
  }, [index]);

  const close = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay || prefersReducedMotion()) {
      onClose();
      return;
    }
    gsap.to(contentRef.current, {
      scale: 0.985,
      autoAlpha: 0,
      duration: DURATION.fast * 0.8,
      ease: "power2.in",
    });
    gsap.to(overlay, {
      autoAlpha: 0,
      duration: DURATION.fast * 0.8,
      ease: "power2.in",
      onComplete: onClose,
    });
  }, [onClose]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          overlayRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: DURATION.fast, ease: "power2.out" },
        );
        gsap.fromTo(
          contentRef.current,
          { autoAlpha: 0, scale: 0.96 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: DURATION.base,
            delay: 0.05,
            ease: EASE.out,
          },
        );
      });
      return () => mm.revert();
    },
    { scope: overlayRef },
  );

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.documentElement.style.overflow;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
    };
  }, [close]);

  if (!video) return null;

  const theater = (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      data-theme="dark"
      data-film-theater
      onContextMenu={(event) => event.preventDefault()}
      className="fixed inset-0 z-[70] flex flex-col bg-background-deep text-primary"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <p className="min-w-0 truncate text-label uppercase tracking-label-wide text-muted">
          {video.title}
          {video.durationSeconds
            ? ` · ${formatDuration(video.durationSeconds)}`
            : ""}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          className="min-h-11 shrink-0 rounded-pill px-4 text-label uppercase tracking-label-wide text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
        >
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 justify-center px-4 pb-4 lg:px-8">
        <div
          data-theater-scroll
          className="min-h-0 w-full max-w-6xl overflow-y-auto overscroll-contain"
        >
          <div className="flex min-h-full items-center justify-center">
            <div ref={contentRef} className="relative w-full">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                key={video.id}
                src={video.src}
                poster={video.poster ?? undefined}
                controls
                controlsList="nodownload"
                autoPlay
                playsInline
                preload="metadata"
                data-film-video
                onCanPlay={() => setBuffering(false)}
                onPlaying={() => setBuffering(false)}
                onWaiting={() => setBuffering(true)}
                className="max-h-[82dvh] w-full bg-background-deep"
              />
              <span
                aria-hidden
                data-film-buffering
                className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-out ${
                  buffering ? "opacity-100" : "opacity-0"
                }`}
              >
                <MediaSkeleton />
              </span>
            </div>
          </div>
        </div>
      </div>

      {videos.length > 1 ? (
        <div className="container-editorial flex items-center justify-between gap-4 pb-5">
          <button
            type="button"
            onClick={() =>
              setIndex((index - 1 + videos.length) % videos.length)
            }
            className="min-h-11 text-button font-medium text-secondary transition-colors hover:text-primary"
          >
            ← Previous film
          </button>
          <p className="text-label uppercase tracking-label-wide text-muted">
            {index + 1} / {videos.length}
          </p>
          <button
            type="button"
            onClick={() => setIndex((index + 1) % videos.length)}
            className="min-h-11 text-button font-medium text-secondary transition-colors hover:text-primary"
          >
            Next film →
          </button>
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(theater, document.body);
}

interface FilmPosterProps {
  video: VideoAsset;
  label?: string;
  large?: boolean;
}

/** Big poster-first film card, opens the theater on interaction (§31.23). */
export function FilmPoster({ video, large = false }: FilmPosterProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play ${video.title}`}
        className="group block w-full text-left"
      >
        <FadeImg
          src={video.poster}
          imgClassName="media-color-reveal"
        >
          <span className="absolute inset-0 flex items-center justify-center">
            <PlayBadge large={large} />
          </span>
          {video.wedding ? <WeddingMark /> : null}
          {video.durationSeconds ? (
            <span className="absolute bottom-4 right-4 rounded-pill bg-background-deep/85 px-3 py-1 text-label uppercase tracking-label-wide text-primary">
              {formatDuration(video.durationSeconds)}
            </span>
          ) : null}
        </FadeImg>
      </button>
      {open ? (
        <FilmTheater
          videos={[video]}
          initialIndex={0}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

interface FilmListProps {
  videos: VideoAsset[];
  /** Project context for the hover preview over each poster. */
  previewTitle?: string;
  previewMeta?: string;
}

/** All cuts of a project, every film opens in the theater. */
export function FilmList({ videos, previewTitle, previewMeta }: FilmListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <>
      <RevealGroup variant="media" itemSelector="[data-film-item]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {videos.map((video, index) => (
            <article key={video.id} data-film-item={video.id}>
              <button
                type="button"
                ref={(node) => {
                  triggerRefs.current[index] = node;
                }}
                onClick={() => setOpenIndex(index)}
                aria-label={`Play ${video.title}`}
                className="group block w-full text-left"
              >
                <FadeImg src={video.poster} imgClassName="media-color-reveal">
                  <span className="absolute inset-0 flex items-center justify-center">
                    <PlayBadge />
                  </span>
                  {video.wedding ? <WeddingMark /> : null}
                  {video.durationSeconds ? (
                    <span className="absolute bottom-4 right-4 rounded-pill bg-background-deep/85 px-3 py-1 text-label uppercase tracking-label-wide text-primary">
                      {formatDuration(video.durationSeconds)}
                    </span>
                  ) : null}
                  {previewTitle ? (
                    <MediaHoverPreview
                      eyebrow={video.title}
                      title={previewTitle}
                      meta={previewMeta ?? ""}
                    />
                  ) : null}
                </FadeImg>
                <h3 className="mt-4 font-display text-display-sm">{video.title}</h3>
              </button>
            </article>
          ))}
        </div>
      </RevealGroup>
      {openIndex !== null ? (
        <FilmTheater
          videos={videos}
          initialIndex={openIndex}
          onClose={() => {
            setOpenIndex(null);
            triggerRefs.current[openIndex]?.focus();
          }}
        />
      ) : null}
    </>
  );
}
