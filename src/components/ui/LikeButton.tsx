"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useVisitorId } from "@/lib/use-visitor-id";

interface LikeButtonProps {
  entity: "project" | "article";
  slug: string;
  className?: string;
}

interface LikeState {
  count: number;
  liked: boolean;
}

const PARTICLE_COUNT = 6;

/**
 * Realtime like button (studio request): optimistic on click, saved
 * immediately through /api/likes, one like per visitor. Motion is
 * decorative: reduced-motion visitors get an instant swap without the
 * heart spring or the particle burst.
 */
export function LikeButton({ entity, slug, className }: LikeButtonProps) {
  const visitorId = useVisitorId();
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<LikeState | null>(null);
  const [burst, setBurst] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!visitorId) return;
    let cancelled = false;
    const query = new URLSearchParams({
      entity,
      slug,
      visitor: visitorId,
    });
    fetch(`/api/likes?${query.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body?.data) setState(body.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entity, slug, visitorId]);

  const toggle = useCallback(async () => {
    if (!visitorId || !state || pending) return;
    const previous = state;
    const next = {
      count: state.count + (state.liked ? -1 : 1),
      liked: !state.liked,
    };
    setState(next);
    if (next.liked) setBurst((value) => value + 1);
    setPending(true);
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, slug, visitor: visitorId }),
      });
      if (!response.ok) throw new Error("like failed");
      const body = await response.json();
      if (body?.data) setState(body.data);
    } catch {
      setState(previous);
    } finally {
      setPending(false);
    }
  }, [entity, pending, slug, state, visitorId]);

  const liked = state?.liked ?? false;

  return (
    <button
      type="button"
      data-like-button
      onClick={toggle}
      disabled={!state || pending}
      aria-pressed={liked}
      aria-label={liked ? "Remove like" : "Like"}
      className={cn(
        "group inline-flex h-11 items-center gap-2 rounded-pill border border-line px-4 text-button font-medium text-secondary transition-colors duration-300 hover:border-line-strong hover:text-primary disabled:opacity-60",
        className,
      )}
    >
      <span className="relative block h-[18px] w-[18px]">
        <motion.span
          key={liked ? "liked" : "idle"}
          initial={reducedMotion ? false : { scale: 0.55 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 20 }}
          className="block"
        >
          <Heart
            aria-hidden
            className={cn(
              "h-[18px] w-[18px] transition-colors duration-300",
              liked ? "fill-error text-error" : "text-current",
            )}
          />
        </motion.span>
        {!reducedMotion && burst > 0 ? (
          <span key={burst} aria-hidden className="absolute inset-0 block">
            {Array.from({ length: PARTICLE_COUNT }, (_, index) => {
              const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
              return (
                <motion.span
                  key={index}
                  className="absolute left-1/2 top-1/2 block h-1 w-1 rounded-full bg-error"
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    x: Math.cos(angle) * 16,
                    y: Math.sin(angle) * 16,
                    scale: 0.4,
                  }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              );
            })}
          </span>
        ) : null}
      </span>
      <span className="relative block min-w-4 overflow-hidden text-center tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state?.count ?? "loading"}
            initial={reducedMotion ? false : { y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? undefined : { y: -8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="block"
          >
            {state ? state.count : ""}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
