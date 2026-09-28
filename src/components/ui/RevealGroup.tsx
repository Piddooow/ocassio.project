"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { EASE } from "@/lib/motion";
import { useMediaReveal } from "@/lib/media-reveal";

interface RevealGroupProps {
  children: React.ReactNode;
  className?: string;
  /** Scoped selector for the items to stagger. */
  itemSelector?: string;
  stagger?: number;
  y?: number;
  /**
   * "media" routes the items through the shared photograph entrance so
   * media grids reveal exactly like the Work masonry.
   */
  variant?: "default" | "media";
}

/**
 * Staggers a set of items into view once, on scroll (§31.25).
 * Content stays visible without JS; motion only when allowed.
 */
export function RevealGroup({
  children,
  className,
  itemSelector = ":scope > *",
  stagger = 0.07,
  y = 24,
  variant = "default",
}: RevealGroupProps) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (variant !== "default" || !scope.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = gsap.utils.toArray<Element>(itemSelector, scope.current);
        if (items.length === 0) return;
        gsap.fromTo(
          items,
          { autoAlpha: 0, y },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger,
            ease: EASE.out,
            scrollTrigger: {
              trigger: scope.current,
              start: "top 85%",
              once: true,
            },
          },
        );
      });
      return () => mm.revert();
    },
    { scope },
  );

  useMediaReveal(scope, {
    selector: itemSelector,
    enabled: variant === "media",
  });

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
