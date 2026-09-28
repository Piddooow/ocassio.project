"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { onTransitionRequest } from "@/lib/transition-bus";
import { prefersReducedMotion } from "@/lib/motion";

/** Minimum visible hold; the exit fade lands the full moment at ~1.4s. */
const MIN_VISIBLE_MS = 1150;
/** Never trap the visitor if a navigation silently fails. */
const SAFETY_MS = 8000;

const SQUARES: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [2, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
];

/**
 * Page transition loader (studio request): one bare loading animation,
 * centered on an opaque palette surface. The diagonal wave of squares is
 * the same moment on every internal navigation and on theme switches, and
 * the layer only clears once the new page has actually committed (URL
 * changed) and painted, never before the minimum 1.4s moment. It is
 * purely visual (pointer-events none), carries no brand art, and skips
 * admin routes, external links, modified clicks, back/forward and
 * reduced-motion users.
 */
export function NavigationLoader() {
  const [active, setActive] = useState(false);
  const pendingRef = useRef<{
    startedAt: number;
    waitFor: Promise<unknown> | null;
  } | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (safetyTimerRef.current !== null) {
        window.clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      if (watchRef.current !== null) {
        cancelAnimationFrame(watchRef.current);
        watchRef.current = null;
      }
    };

    const finish = () => {
      clearTimers();
      pendingRef.current = null;
      setActive(false);
    };

    /** Waits out the minimum moment, then hides after one more paint. */
    const hideWhenReady = () => {
      const pending = pendingRef.current;
      if (!pending) return;
      const elapsed = performance.now() - pending.startedAt;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(finish));
      }, remaining);
    };

    /** Watches the URL until the clicked destination has committed. */
    const watchUrl = (from: string) => {
      if (watchRef.current !== null) cancelAnimationFrame(watchRef.current);
      const step = () => {
        if (!pendingRef.current) return;
        if (`${window.location.pathname}${window.location.search}` !== from) {
          hideWhenReady();
          return;
        }
        watchRef.current = requestAnimationFrame(step);
      };
      watchRef.current = requestAnimationFrame(step);
    };

    const begin = (
      options: { waitFor?: Promise<unknown>; watchLocation?: boolean } = {},
    ) => {
      if (prefersReducedMotion()) return;
      if (window.location.pathname.startsWith("/admin")) return;

      clearTimers();
      const startedAt = performance.now();
      pendingRef.current = { startedAt, waitFor: options.waitFor ?? null };
      setActive(true);

      if (options.watchLocation) {
        watchUrl(`${window.location.pathname}${window.location.search}`);
      }
      if (options.waitFor) {
        options.waitFor.then(hideWhenReady, hideWhenReady);
      }
      safetyTimerRef.current = window.setTimeout(finish, SAFETY_MS);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!anchor) return;
      if (anchor.getAttribute("target") === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href") ?? "";
      if (
        !href.startsWith("/") ||
        href.startsWith("//") ||
        href.startsWith("/admin")
      ) {
        return;
      }
      const next = new URL(href, window.location.href);
      if (next.origin !== window.location.origin) return;
      if (
        next.pathname === window.location.pathname &&
        next.search === window.location.search
      ) {
        return;
      }
      begin({ watchLocation: true });
    };

    const unsubscribe = onTransitionRequest((request) => {
      begin({ waitFor: request.waitFor });
    });

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      unsubscribe();
      clearTimers();
    };
  }, []);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          data-nav-loader
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center bg-background-deep text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {/* Bare loading animation: a diagonal wave of squares, centered
              on its own at a normal indicator size (12px cells, 6px gap). */}
          <div data-loader-mark className="grid grid-cols-3 gap-[6px]">
            {SQUARES.map(([x, y], index) => (
              <motion.span
                key={index}
                className="h-3 w-3 rounded-[3px] bg-current"
                animate={{ opacity: [0.12, 1, 0.12] }}
                transition={{
                  duration: 1.1,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: (x + y) * 0.12,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
