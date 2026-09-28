"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

export interface AvatarPerson {
  id: string;
  name: string;
  /** Smallest built variant of the portrait. */
  src: string;
}

const SIZE = 44;
// Stacked, each avatar hides a third of the one before it.
const CLOSED_STEP = 30;
// Fanned, a 6px gap: close enough to still read as one group.
const OPEN_STEP = 50;
// A touch of bounce so the fan feels like it springs open, not slides.
const FAN = { type: "spring", visualDuration: 0.3, bounce: 0.15 } as const;
const INSTANT = { duration: 0 } as const;
// Fallback in case a completion callback is missed mid-frame (or a hover
// interrupt restarts the fade); the beat is 2.6s, so there is room.
const LEAVE_MS = 900;

/**
 * Footer photo strip (studio request): at most four portraits, taking
 * turns as a queue. On each beat the front portrait fades away, the queue
 * slides one step forward, and the next portrait rises from behind the
 * stack. Hovering or focusing the strip fans it open and pauses the
 * rotation; reduced motion stops both.
 *
 * The leave happens as an explicit first phase (the front card fades in
 * place) and only then the queue rotates, so the portrait count in the
 * DOM is always exactly `max` and nothing can get stuck mid-exit.
 */
export function AvatarStack({
  people,
  label = "Photos",
  intervalMs = 2600,
  max = 4,
  className,
}: {
  people: AvatarPerson[];
  label?: string;
  intervalMs?: number;
  /** Most portraits visible at once; the rest wait behind. */
  max?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const count = Math.min(max, people.length);
  const mid = (count - 1) / 2;
  const rotatable = people.length > count;

  const [rotation, setRotation] = useState(() => ({
    // Newest first: index 0 is the back of the strip, the last item is the
    // front that leaves next. Reversing the initial slice keeps the cycle
    // collision-free (no portrait can re-enter while still visible).
    list: [...people.slice(0, count)].reverse(),
    cursor: count,
  }));
  const [leaving, setLeaving] = useState(false);
  const [fanned, setFanned] = useState(false);
  const paused = useRef(false);

  const finishLeave = useCallback(() => {
    setRotation((current) => {
      const next = people[current.cursor % people.length];
      if (!next) return current;
      return {
        list: [next, ...current.list.slice(0, count - 1)],
        cursor: current.cursor + 1,
      };
    });
    setLeaving(false);
  }, [people, count]);

  useEffect(() => {
    if (reduceMotion || !rotatable) return;
    const timer = setInterval(() => {
      if (paused.current || leaving) return;
      setLeaving(true);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [reduceMotion, rotatable, intervalMs, leaving]);

  // Backstop: rotate even if the completion callback never arrives.
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(finishLeave, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving, finishLeave]);

  if (count === 0) return null;

  const queue = rotation.list;
  const frontIndex = queue.length - 1;
  const step = fanned ? OPEN_STEP : CLOSED_STEP;
  const shift = reduceMotion ? INSTANT : FAN;
  const fade = reduceMotion ? INSTANT : { duration: 0.35 };
  const pop = reduceMotion ? INSTANT : { duration: 0.3, ease: "easeOut" as const };

  return (
    <div
      role="group"
      aria-label={label}
      data-avatar-stack
      data-lead-id={queue[frontIndex]?.id}
      // Sized for the fanned strip up front, and every avatar is placed
      // from the center, so fanning grows both ways and nothing moves.
      style={{ width: (count - 1) * OPEN_STEP + SIZE, height: SIZE }}
      className={cn("relative", className)}
      onPointerEnter={(event) => {
        paused.current = true;
        if (event.pointerType === "touch") return;
        setFanned(true);
      }}
      onPointerLeave={(event) => {
        paused.current = false;
        if (event.pointerType === "touch") return;
        setFanned(false);
      }}
      onFocus={() => {
        paused.current = true;
        setFanned(true);
      }}
      onBlur={() => {
        paused.current = false;
        setFanned(false);
      }}
      tabIndex={0}
    >
      {queue.map((person, index) => {
        const offset = index - mid;
        const isFront = index === frontIndex;
        const hidden = leaving && isFront;
        return (
          <motion.div
            key={person.id}
            // Later items sit on top, so the front portrait is the
            // rightmost one in the strip.
            className="group/avatar absolute top-0 left-1/2 rounded-full ring-2 ring-background hover:z-20"
            style={{ width: SIZE, height: SIZE, marginLeft: -SIZE / 2 }}
            initial={{ x: offset * step, opacity: 0, scale: 0.86 }}
            animate={{
              x: offset * step,
              opacity: hidden ? 0 : 1,
              scale: hidden ? 0.9 : 1,
            }}
            transition={{ x: shift, opacity: fade, scale: pop }}
            onAnimationComplete={() => {
              if (leaving && isFront) finishLeave();
            }}
          >
            <img
              src={person.src}
              alt={person.name}
              width={SIZE}
              height={SIZE}
              loading="lazy"
              decoding="async"
              draggable={false}
              data-avatar-item
              className="size-full rounded-full object-cover"
            />
            <span
              aria-hidden
              data-avatar-tooltip
              className={cn(
                "pointer-events-none absolute bottom-full left-1/2 mb-2 origin-bottom rounded-full bg-primary px-2.5 py-1 text-caption font-medium whitespace-nowrap text-background",
                "invisible translate-y-0.5 opacity-0 transition-[opacity,translate,visibility] duration-100 ease-out",
                "group-hover/avatar:visible group-hover/avatar:translate-y-0 group-hover/avatar:opacity-100 group-hover/avatar:duration-150",
                "motion-reduce:transition-none",
              )}
            >
              {person.name}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
