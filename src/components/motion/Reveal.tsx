"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DURATION, EASE, REVEAL } from "@/lib/motion";
import { useMediaReveal } from "@/lib/media-reveal";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Extra delay in seconds (staggering few siblings). */
  delay?: number;
  /**
   * "media" plays the shared photograph entrance (blur + rise) instead of
   * the text reveal, so big single frames move like every grid frame.
   */
  variant?: "default" | "media";
}

/**
 * Scroll-triggered entrance: opacity + short rise.
 * Content stays visible without JS; the tween only runs when motion is allowed.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "default",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (variant !== "default") return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ref.current,
          { autoAlpha: 0, y: REVEAL.y },
          {
            autoAlpha: 1,
            y: 0,
            duration: DURATION.slow,
            delay,
            ease: EASE.out,
            scrollTrigger: {
              trigger: ref.current,
              start: "top 88%",
              once: true,
            },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  useMediaReveal(ref, { delay, enabled: variant === "media" });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
