"use client";

import type { RefObject } from "react";
import { ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import { EASE, REVEAL, prefersReducedMotion } from "@/lib/motion";

export type MediaRevealFrom = "bottom" | "top" | "left" | "right";

/**
 * One entrance for every photograph on the site (studio request):
 * opacity + short rise + a 2px blur that resolves, batched per viewport
 * crossing. The Work grid, journal feed, project galleries and every
 * single hero photograph all read from these tokens, so the same frame
 * moves the same way on every page.
 */
export const MEDIA_REVEAL = {
  blur: 2,
  duration: 0.7,
  /** Reading-order stagger inside one batch. */
  stagger: REVEAL.stagger,
  /** Items reveal when their top crosses 92% of the viewport. */
  startPercent: 92,
} as const;

const TRAVEL: Record<MediaRevealFrom, { x: number; y: number }> = {
  bottom: { x: 0, y: REVEAL.y },
  top: { x: 0, y: -REVEAL.y },
  left: { x: -REVEAL.y, y: 0 },
  right: { x: REVEAL.y, y: 0 },
};

interface MediaRevealOptions {
  /**
   * Replay the entrance whenever these change; filter grids pass their
   * item list, so every filter click re-reveals the resulting set.
   */
  dependencies?: unknown[];
  from?: MediaRevealFrom;
  /** Items inside the scope; defaults to the scope element itself. */
  selector?: string;
  /** Extra delay before a batch plays (rarely needed). */
  delay?: number;
  /** Set false to keep the scope untouched (component variant switching). */
  enabled?: boolean;
}

/** Elements entering together animate in reading order. */
function inReadingOrder(elements: Element[]): Element[] {
  return elements.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    return aRect.top - bRect.top || aRect.left - bRect.left;
  });
}

/**
 * Photograph/media entrance. Items that are on screen reveal immediately
 * in a stagger; items below the fold are hidden before the browser paints
 * (never a flash) and reveal when their top crosses the 92% line, even if
 * a jump scroll skips them straight past it. Items scrolled past before
 * the entrance could play settle silently, and every item reveals exactly
 * once per dependency change, so no card is ever left hidden and none
 * replays on its own while scrolling.
 */
export function useMediaReveal(
  scope: RefObject<HTMLElement | null>,
  {
    dependencies = [],
    from = "bottom",
    selector,
    delay = 0,
    enabled = true,
  }: MediaRevealOptions = {},
) {
  useGSAP(
    () => {
      if (!enabled || !scope.current || prefersReducedMotion()) return;
      const travel = TRAVEL[from];
      const settled = { autoAlpha: 1, x: 0, y: 0, filter: "blur(0px)" };
      const offset = {
        autoAlpha: 0,
        x: travel.x,
        y: travel.y,
        filter: `blur(${MEDIA_REVEAL.blur}px)`,
      };

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const root = scope.current;
        if (!root) return;
        const nodes = selector
          ? gsap.utils.toArray<HTMLElement>(selector, root)
          : [root];
        if (nodes.length === 0) return;

        const revealLine = window.innerHeight * (MEDIA_REVEAL.startPercent / 100);
        const visible: HTMLElement[] = [];
        const waiting: HTMLElement[] = [];
        for (const node of nodes) {
          const rect = node.getBoundingClientRect();
          if (rect.bottom <= 0) {
            // Scrolled past before the entrance could play: settle it.
            gsap.set(node, settled);
          } else if (rect.top < revealLine) {
            visible.push(node);
          } else {
            waiting.push(node);
          }
        }

        const play = (elements: Element[]) => {
          if (elements.length === 0) return;
          gsap.to(inReadingOrder(elements), {
            ...settled,
            duration: MEDIA_REVEAL.duration,
            stagger: MEDIA_REVEAL.stagger,
            delay,
            ease: EASE.out,
            overwrite: true,
          });
        };

        // Hide everything that still owes an entrance before the browser
        // paints, so a reveal never flashes in and back out.
        gsap.set([...visible, ...waiting], offset);
        play(visible);

        if (waiting.length === 0) return;
        ScrollTrigger.batch(waiting, {
          start: `top ${MEDIA_REVEAL.startPercent}%`,
          once: true,
          onEnter: (elements) => play(elements),
        });
      });
      return () => mm.revert();
    },
    { scope, dependencies, revertOnUpdate: true },
  );
}
