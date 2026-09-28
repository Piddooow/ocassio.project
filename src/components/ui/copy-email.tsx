"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

type Status = "idle" | "copied" | "failed";

// One letter's flip. Each letter starts a beat after its left neighbour,
// so the message reads as a wave running through the address.
const FLIP = { duration: 0.22, ease: [0.23, 1, 0.32, 1] } as const;
const STAGGER = 0.018;
// The box eases to its new width over the same span the wave takes to
// cross it. Width (not scale) on purpose: the neighbours should reflow.
const WIDTH_MS = 320;

/**
 * Copy-to-clipboard email (studio request): the address flips letter by
 * letter into the confirmation, with a quiet mailto arrow beside it.
 * Clipboard errors are surfaced honestly; reduced motion swaps the flip
 * for a simple fade.
 */
export function CopyEmail({
  email,
  copiedText = "Copied to clipboard",
  // Long enough to read the confirmation, short enough to feel returned.
  resetAfter = 1600,
  className,
}: {
  email: string;
  copiedText?: string;
  resetAfter?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const attempt = useRef(0);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [boxWidth, setBoxWidth] = useState<number | null>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (next: Exclude<Status, "idle">) => {
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), resetAfter);
  };

  const copy = async () => {
    const id = ++attempt.current;
    // Confirm on press; the write is near instant and waiting makes the
    // click feel ignored.
    show("copied");
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(email);
    } catch {
      if (id === attempt.current) show("failed");
    }
  };

  const shown =
    status === "copied"
      ? copiedText
      : status === "failed"
        ? "Couldn't copy"
        : email;
  // Every text shares these slots; the extras sit blank at the tail and
  // are clipped by the animating width.
  const slots = Math.max(email.length, copiedText.length, 13);

  // The width follows the measured text in real pixels (not `ch`), so the
  // letters keep Inter's natural advance and wide glyphs stop overlapping.
  useLayoutEffect(() => {
    const measure = () => {
      const probe = probeRef.current;
      if (probe) setBoxWidth(probe.getBoundingClientRect().width);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
  }, [shown]);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="group/copy relative inline-flex">
        <button
          type="button"
          data-copy-email
          data-copy-status={status}
          onClick={copy}
          aria-label={`Copy email address ${email}`}
          className="relative flex h-9 touch-manipulation items-center rounded-md px-2 text-body-sm font-medium text-primary outline-hidden transition-[scale,background-color] duration-150 ease-out select-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-line-strong focus-visible:outline-offset-2 active:scale-[0.96] motion-reduce:transition-[background-color]"
        >
          <span
            ref={probeRef}
            aria-hidden
            className="pointer-events-none invisible absolute top-0 left-2 whitespace-pre"
          >
            {shown}
          </span>
          <span
            aria-hidden
            className="flex overflow-hidden transition-[width] ease-[cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none"
            style={{
              width: boxWidth !== null ? `${boxWidth}px` : "auto",
              transitionDuration: `${WIDTH_MS}ms`,
              // Room for the flip's perspective to read as depth.
              perspective: 240,
            }}
          >
            {Array.from({ length: slots }, (_, i) => (
              <Letter
                key={i}
                char={shown[i] ?? " "}
                delay={i * STAGGER}
                reduceMotion={reduceMotion}
              />
            ))}
          </span>
        </button>

        {/* A whisper of what the click does. Hidden once the text itself
            is saying something, and never on touch, where hover lies. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 translate-y-0.5 rounded-full bg-primary px-2 py-0.5 text-caption font-medium whitespace-nowrap text-background opacity-0",
            "transition-[opacity,translate] duration-100 ease-out [@media(hover:hover)]:group-hover/copy:translate-y-0 [@media(hover:hover)]:group-hover/copy:opacity-100 [@media(hover:hover)]:group-hover/copy:delay-300 [@media(hover:hover)]:group-hover/copy:duration-150",
            status !== "idle" && "invisible",
          )}
        >
          Click to copy
        </span>
      </span>

      <a
        href={`mailto:${email}`}
        aria-label={`Email ${email}`}
        className="relative flex size-7 touch-manipulation items-center justify-center rounded-md text-muted outline-hidden transition-[scale,color,background-color] duration-150 ease-out after:absolute after:-inset-1.5 hover:bg-surface-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-line-strong active:scale-[0.96]"
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 11 11 5M6 5h5v5" />
        </svg>
      </a>

      <span className="sr-only" aria-live="polite">
        {status === "copied"
          ? copiedText
          : status === "failed"
            ? "Couldn't copy"
            : ""}
      </span>
    </span>
  );
}

function Letter({
  char,
  delay,
  reduceMotion,
}: {
  char: string;
  delay: number;
  reduceMotion: boolean;
}) {
  // Two faces: the letter on show, and the one it is leaving. Keying the
  // pair on the char restarts the flip only for slots that change.
  const [faces, setFaces] = useState({ now: char, was: char });
  if (faces.now !== char) setFaces({ now: char, was: faces.now });

  const changed = faces.now !== faces.was;
  return (
    <span className="relative inline-block shrink-0 whitespace-pre [transform-style:preserve-3d]">
      <motion.span
        key={`in-${faces.now}-${faces.was}`}
        className="block origin-[50%_50%_-0.5em] backface-hidden"
        initial={
          changed
            ? reduceMotion
              ? { opacity: 0 }
              : { rotateX: -90, opacity: 0 }
            : false
        }
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ ...FLIP, delay: reduceMotion ? 0 : delay }}
      >
        {faces.now}
      </motion.span>
      {changed ? (
        <motion.span
          key={`out-${faces.now}-${faces.was}`}
          aria-hidden
          className="absolute inset-0 block origin-[50%_50%_-0.5em] backface-hidden"
          initial={{ rotateX: 0, opacity: 1 }}
          animate={reduceMotion ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
          transition={{ ...FLIP, delay: reduceMotion ? 0 : delay }}
        >
          {faces.was}
        </motion.span>
      ) : null}
    </span>
  );
}
