/**
 * Shared motion tokens (§31.25): slow enough to feel premium,
 * fast enough to remain responsive, purposeful, subtle, interruptible.
 */
export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
} as const;

export const DURATION = {
  fast: 0.3,
  base: 0.6,
  slow: 0.8,
} as const;

export const REVEAL = {
  y: 28,
  stagger: 0.06,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
