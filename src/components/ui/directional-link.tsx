"use client";

import { useRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Side = "left" | "right";

// Clip insets (left, right) for each resting place of the line. Hidden
// "at" a side means collapsed against that edge, so drawing from there
// grows away from it and hiding toward it shrinks into it.
const HIDDEN_AT: Record<Side, [string, string]> = {
  left: ["0%", "100%"],
  right: ["100%", "0%"],
};
const SHOWN: [string, string] = ["0%", "0%"];

function set(el: HTMLElement, [l, r]: [string, string]) {
  el.style.setProperty("--ul-l", l);
  el.style.setProperty("--ul-r", r);
}

// hidden: whether the line is fully gone. Only then is it safe to teleport
// it to the other edge; mid-exit it just reverses from where it is.
function draw(el: HTMLElement, hidden: { current: boolean }, from: Side) {
  if (hidden.current) {
    el.dataset.instant = "";
    set(el, HIDDEN_AT[from]);
    // Commits the start position before the transition is restored.
    void el.offsetWidth;
    delete el.dataset.instant;
  }
  hidden.current = false;
  delete el.dataset.leaving;
  el.dataset.on = "";
  set(el, SHOWN);
}

function erase(el: HTMLElement, toward: Side) {
  el.dataset.leaving = "";
  delete el.dataset.on;
  set(el, HIDDEN_AT[toward]);
}

function sideOf(el: HTMLElement, clientX: number): Side {
  const r = el.getBoundingClientRect();
  return clientX < r.left + r.width / 2 ? "left" : "right";
}

/**
 * Directional underline link (studio request): the hairline draws in from
 * the side the cursor entered and leaves toward the side it exited, so
 * prose links feel hand-made without a hover colour shift. Keyboard focus
 * draws from the start; reduced motion fades the whole line instead.
 */
export function DirectionalLink({
  className,
  rest = false,
  children,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: ComponentProps<"a"> & {
  /** Keeps a faint line under the link at rest, for links inside prose. */
  rest?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const hidden = useRef(true);
  const hovered = useRef(false);

  return (
    <a
      ref={ref}
      {...props}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (e.pointerType === "touch") return;
        hovered.current = true;
        draw(e.currentTarget, hidden, sideOf(e.currentTarget, e.clientX));
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (e.pointerType === "touch") return;
        hovered.current = false;
        // Keyboard focus still owns the line.
        if (e.currentTarget.matches(":focus-visible")) return;
        erase(e.currentTarget, sideOf(e.currentTarget, e.clientX));
      }}
      onFocus={(e) => {
        onFocus?.(e);
        // Reading order: a focused link underlines from the start of the text.
        if (e.currentTarget.matches(":focus-visible"))
          draw(e.currentTarget, hidden, "left");
      }}
      onBlur={(e) => {
        onBlur?.(e);
        if (!hovered.current) erase(e.currentTarget, "right");
      }}
      // A pseudo-element's transitionend is dispatched on its host, so
      // target === currentTarget here means the line itself settled.
      onTransitionEnd={(e) => {
        if (e.target !== e.currentTarget || e.propertyName !== "clip-path")
          return;
        const l = e.currentTarget.style.getPropertyValue("--ul-l");
        const r = e.currentTarget.style.getPropertyValue("--ul-r");
        hidden.current = l === "100%" || r === "100%";
      }}
      className={cn(
        "relative inline-block rounded-[2px] leading-tight text-primary outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong",
        // The resting hairline, for prose where a link must look like one.
        rest &&
          "before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-line",
        // The drawn line. Clip, not scaleX: its origin can't jump mid-flight,
        // and it can reverse from any partial state. Enter 240ms, leave 180ms.
        "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-primary after:[clip-path:inset(0_var(--ul-r,100%)_0_var(--ul-l,0%))]",
        "after:transition-[clip-path] after:duration-[240ms] after:ease-[cubic-bezier(0.23,1,0.32,1)]",
        "data-leaving:after:duration-[180ms] data-instant:after:transition-none",
        // Reduced motion: the line fades in whole instead of travelling.
        "motion-reduce:after:[clip-path:none] motion-reduce:after:opacity-0 motion-reduce:after:transition-[opacity] motion-reduce:hover:after:opacity-100 motion-reduce:focus-visible:after:opacity-100 motion-reduce:data-on:after:opacity-100",
        className,
      )}
    >
      {children}
    </a>
  );
}
