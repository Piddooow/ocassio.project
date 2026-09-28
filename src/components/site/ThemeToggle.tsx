"use client";

import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { requestTransition } from "@/lib/transition-bus";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Theme toggle (§28.15, studio request): flips the global [data-theme]
 * between dark (default) and light. The switch cross-fades through the
 * View Transitions API where supported, covered by the shared page
 * transition loader; reduced motion (or no API) swaps instantly.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const reducedMotion = useReducedMotion();

  const toggle = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const startViewTransition = (
      document as Document & {
        startViewTransition?: (callback: () => void) => unknown;
      }
    ).startViewTransition;

    if (reducedMotion || typeof startViewTransition !== "function") {
      setTheme(next);
      return;
    }

    // The loader appears first (two frames to paint), then the view
    // transition cross-fades the page underneath it and finishes.
    const finished = new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const transition = startViewTransition.call(document, () => {
            flushSync(() => setTheme(next));
          }) as { finished?: Promise<unknown> } | undefined;
          (transition?.finished ?? Promise.resolve()).then(
            () => resolve(),
            () => resolve(),
          );
        });
      });
    });
    requestTransition({ waitFor: finished });
  };

  return (
    <button
      type="button"
      data-theme-toggle
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-pill text-secondary transition-colors duration-300 hover:bg-surface-hover hover:text-primary focus-visible:outline-2${
        className ? ` ${className}` : ""
      }`}
    >
      <Sun aria-hidden className="hidden h-[18px] w-[18px] dark:block" />
      <Moon aria-hidden className="block h-[18px] w-[18px] dark:hidden" />
    </button>
  );
}
