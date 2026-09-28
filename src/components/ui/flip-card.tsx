"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/cn";

// Half a turn is a lot of travel for a physical object; under about 300ms it
// reads as a snap rather than a card turning over, so this runs longer than
// most UI. The small bounce lets it settle like something with weight.
const FLIP = { type: "spring", visualDuration: 0.55, bounce: 0.2 } as const;
// A few degrees is enough to feel the card lean in; more and the text skews.
const MAX_TILT = 6;
// Settles in about 300ms with no overshoot, so the lean feels heavy.
const FOLLOW = { stiffness: 300, damping: 30 };
// How far the card rises toward you at the halfway point of a flip.
const LIFT_SCALE = 0.03;

/**
 * Flip card (studio request, adapted from the provided FlipCard): a
 * two-faced card that turns over on click with a pointer lean, used on the
 * About founder portrait. Reduced motion swaps faces with a short fade.
 */
export function FlipCard({
  front,
  back,
  frontLabel = "Show details",
  backLabel = "Show front",
  className,
}: {
  front: ReactNode;
  back: ReactNode;
  frontLabel?: string;
  backLabel?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const frontButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);

  const flip = useMotionValue(0);

  // Pointer position across the card, -1 to 1 on each axis.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, FOLLOW);
  const y = useSpring(pointerY, FOLLOW);
  // The half under the pointer tips toward you.
  const tiltX = useTransform(y, (value) => -value * MAX_TILT);
  const tiltY = useTransform(x, (value) => value * MAX_TILT);

  // 0 when a face is flat to the viewer, 1 when the card is edge-on.
  const lift = useTransform(flip, (value) =>
    Math.abs(Math.sin((value * Math.PI) / 180)),
  );
  const scale = useTransform(lift, (value) => 1 + value * LIFT_SCALE);
  // Tilt adds to the flip in world space, so the lean still follows the
  // cursor when the back is showing.
  const turn = useTransform(() => flip.get() + tiltY.get());
  const transform = useMotionTemplate`rotateX(${tiltX}deg) rotateY(${turn}deg) scale(${scale})`;

  // Raised higher, the shadow falls further away, spreads and darkens.
  const shadowY = useTransform(lift, (value) => 14 + value * 22);
  const shadowScale = useTransform(lift, (value) => 0.92 + value * 0.08);
  const shadowOpacity = useTransform(lift, (value) => 0.25 + value * 0.25);
  const shadowTransform = useMotionTemplate`translateY(${shadowY}px) scale(${shadowScale})`;

  useEffect(() => {
    if (reduceMotion) {
      flip.jump(0);
      return;
    }
    // Starts from the live angle and velocity, so flipping again mid-turn
    // reverses smoothly instead of restarting.
    const controls = animate(flip, flipped ? 180 : 0, FLIP);
    return () => controls.stop();
  }, [flipped, reduceMotion, flip]);

  // The face that was pressed turns inert, so focus follows to the other one.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (flipped ? backButton : frontButton).current?.focus({
      preventScroll: true,
    });
  }, [flipped]);

  const toggle = () => {
    moveFocus.current = true;
    setFlipped((value) => !value);
  };

  const face = "absolute inset-0 rounded-2xl backface-hidden";
  // Reduced motion swaps faces with a short cross-fade in place of the turn.
  const fade = "transition-[opacity] duration-200 ease-out";
  const hitArea =
    "absolute inset-0 z-10 cursor-pointer rounded-[inherit] outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-line-strong";

  return (
    <div
      className={cn(
        "relative h-[440px] w-[min(330px,100%)] touch-manipulation transition-[scale] duration-150 ease-out select-none has-[button:active]:scale-[0.96] motion-reduce:transition-none",
        className,
      )}
      onPointerMove={(event) => {
        // Touch would fight the page scroll, so leaning is for mouse and pen.
        if (reduceMotion || event.pointerType === "touch") return;
        const rect = event.currentTarget.getBoundingClientRect();
        pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
        pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-x-6 top-10 bottom-2 rounded-2xl bg-black/25 blur-2xl"
        style={{ transform: shadowTransform, opacity: shadowOpacity }}
      />
      <div className="absolute inset-0 perspective-[1200px]">
        <motion.div
          className="relative size-full transform-3d"
          style={{ transform: reduceMotion ? "none" : transform }}
        >
          <div
            className={cn(
              face,
              reduceMotion && fade,
              reduceMotion && flipped && "opacity-0",
            )}
            inert={flipped}
            aria-hidden={flipped}
          >
            <button
              ref={frontButton}
              type="button"
              aria-label={frontLabel}
              onClick={toggle}
              className={hitArea}
            />
            {front}
          </div>
          <div
            className={cn(
              face,
              reduceMotion ? fade : "rotate-y-180",
              reduceMotion && !flipped && "opacity-0",
            )}
            inert={!flipped}
            aria-hidden={!flipped}
          >
            <button
              ref={backButton}
              type="button"
              aria-label={backLabel}
              onClick={toggle}
              className={hitArea}
            />
            {back}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Small corner hint naming the hidden face. */
export function FlipHint({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-caption font-medium">
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M13.25 8a5.25 5.25 0 0 1-9.4 3.2M2.75 8a5.25 5.25 0 0 1 9.4-3.2" />
        <path d="M12.5 2.25v2.5H10M3.5 13.75v-2.5H6" />
      </svg>
      {children}
    </span>
  );
}
