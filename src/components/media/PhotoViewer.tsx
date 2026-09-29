"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap, useGSAP } from "@/lib/gsap";
import { DURATION, EASE, prefersReducedMotion } from "@/lib/motion";
import { largestVariant, type PhotoAsset } from "@/lib/content/media";
import { MediaSkeleton } from "./MediaSkeleton";

interface PhotoViewerProps {
  photos: PhotoAsset[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  label: string;
}

/**
 * Full-screen photo viewer (§31.17, §16): opens the largest variant at its
 * original ratio, GSAP open/close choreography, keyboard navigation
 * (Esc / arrows), focus restore, reduced-motion support, and the studio's
 * copy deterrents.
 *
 * Stepping never waits: the neighbouring frames are preloaded and decoded,
 * and the current frame stays on screen until the next one is ready, so a
 * step is a single soft slide with no skeleton and no blank frame. The
 * first photograph has no previous control and the last has no next
 * control (no wrap-around).
 */
export function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  label,
}: PhotoViewerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  /** Sources already decoded in this session, so swaps paint instantly. */
  const decodedRef = useRef<Set<string>>(new Set());
  const directionRef = useRef<1 | -1>(1);
  const firstFrameRef = useRef(true);
  const [shownSrc, setShownSrc] = useState(() =>
    photos[index] ? largestVariant(photos[index]) : "",
  );
  const [shownReady, setShownReady] = useState(false);

  const atStart = index === 0;
  const atEnd = index === photos.length - 1;

  const close = useCallback(() => {
    const overlay = overlayRef.current;
    const finish = () => onClose();
    if (!overlay || prefersReducedMotion()) {
      finish();
      return;
    }
    gsap.to(overlay, {
      autoAlpha: 0,
      duration: DURATION.fast * 0.7,
      ease: "power2.in",
      onComplete: finish,
    });
    gsap.to(contentRef.current, {
      scale: 0.985,
      duration: DURATION.fast * 0.7,
      ease: "power2.in",
    });
  }, [onClose]);

  /** One step, clamped: the ends never wrap around. */
  const step = useCallback(
    (delta: 1 | -1) => {
      const next = index + delta;
      if (next < 0 || next >= photos.length) return;
      directionRef.current = delta;
      onIndex(next);
    },
    [index, onIndex, photos.length],
  );

  // Warm the neighbours (and their neighbours) so a step has nothing to wait
  // for. Clamped to the real list, so nothing outside it is fetched.
  useEffect(() => {
    const warm = (url: string) => {
      if (!url || decodedRef.current.has(url)) return;
      const image = new Image();
      image.src = url;
      const ready = image.decode ? image.decode() : Promise.resolve();
      ready
        .then(() => decodedRef.current.add(url))
        .catch(() => {});
    };
    for (const offset of [0, 1, -1, 2, -2]) {
      const neighbour = photos[index + offset];
      if (neighbour) warm(largestVariant(neighbour));
    }
  }, [index, photos]);

  // Resolve the frame to paint: decoded sources swap immediately, otherwise
  // the current frame stays visible until the next one is ready.
  useEffect(() => {
    const current = photos[index];
    if (!current) return;
    const url = largestVariant(current);
    if (url === shownSrc && shownReady) return;

    let cancelled = false;
    const commit = () => {
      if (cancelled) return;
      const isSwap = url !== shownSrc && !firstFrameRef.current;
      setShownSrc(url);
      setShownReady(true);
      if (isSwap && !prefersReducedMotion()) {
        gsap.fromTo(
          contentRef.current,
          { autoAlpha: 0.4, x: 18 * directionRef.current },
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.28,
            ease: "power2.out",
            overwrite: true,
          },
        );
      }
      firstFrameRef.current = false;
    };

    if (decodedRef.current.has(url)) {
      commit();
      return;
    }

    const image = new Image();
    image.src = url;
    const ready = image.decode ? image.decode() : Promise.resolve();
    ready.then(commit).catch(commit);

    return () => {
      cancelled = true;
    };
  }, [index, photos, shownSrc, shownReady]);

  // Open choreography: overlay, frame and chrome settle in exactly once.
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
          { autoAlpha: 0, scale: 0.965 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: DURATION.base,
            ease: EASE.out,
            delay: 0.05,
          },
        );
        gsap.fromTo(
          "[data-viewer-chrome]",
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            y: 0,
            duration: DURATION.fast,
            stagger: 0.04,
            delay: 0.12,
            ease: EASE.out,
          },
        );
      });
      return () => mm.revert();
    },
    { scope: overlayRef },
  );

  // Keyboard + scroll lock while the viewer is open.
  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
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
  }, [close, step]);

  const current = photos[index];
  if (!current) return null;

  const navClass = (disabled: boolean) =>
    `flex min-h-11 min-w-11 shrink-0 items-center justify-center self-center rounded-pill transition-colors ${
      disabled
        ? "cursor-default text-muted opacity-30"
        : "text-secondary hover:bg-surface-hover hover:text-primary"
    }`;

  const viewer = (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-theme="dark"
      data-photo-viewer
      onContextMenu={(event) => event.preventDefault()}
      className="fixed inset-0 z-[70] flex flex-col bg-background-deep text-primary"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <p
          data-viewer-chrome
          data-viewer-counter
          className="text-label uppercase tracking-label-wide text-muted"
        >
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(photos.length).padStart(2, "0")}
        </p>
        <button
          data-viewer-chrome
          ref={closeRef}
          type="button"
          onClick={close}
          className="min-h-11 rounded-pill px-4 text-label uppercase tracking-label-wide text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
        >
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch justify-center gap-2 px-4 pb-6 lg:gap-6 lg:px-8">
        <button
          data-viewer-chrome
          type="button"
          onClick={() => step(-1)}
          disabled={atStart}
          aria-label="Previous photograph"
          className={navClass(atStart)}
        >
          ←
        </button>
        <div
          data-viewer-scroll
          className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              ref={contentRef}
              className="media-guard relative flex items-center justify-center"
              data-viewer-frame
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shownSrc}
                alt=""
                width={current.width}
                height={current.height}
                draggable={false}
                onLoad={() => setShownReady(true)}
                onError={() => setShownReady(true)}
                className={`max-h-[78dvh] w-auto max-w-full object-contain ${
                  shownReady
                    ? "opacity-100"
                    : "opacity-0 transition-opacity duration-500 ease-out"
                }`}
                decoding="async"
              />
              <span aria-hidden data-media-shield className="media-shield" />
              {!shownReady ? <MediaSkeleton /> : null}
            </div>
          </div>
        </div>
        <button
          data-viewer-chrome
          type="button"
          onClick={() => step(1)}
          disabled={atEnd}
          aria-label="Next photograph"
          className={navClass(atEnd)}
        >
          →
        </button>
      </div>

      <div
        data-viewer-chrome
        className="container-editorial flex items-baseline justify-between gap-4 pb-4"
      >
        <p className="text-caption text-muted">{current.file}</p>
        <p className="text-label uppercase tracking-label-wide text-muted">
          Use ← → to move · Esc to close
        </p>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(viewer, document.body);
}
