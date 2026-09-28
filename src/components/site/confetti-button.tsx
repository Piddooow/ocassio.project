"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ConfettiButtonProps {
  label?: string;
  hint?: string;
  variant?: "primary" | "secondary" | "tertiary";
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
  round: boolean;
  life: number;
}

const FALLBACK = { ink: "#171717", muted: "#737373", accent: "#ef4444" };

/** Resolve the confetti palette from the live theme tokens. */
function readPalette() {
  if (typeof window === "undefined") return FALLBACK;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    ink: read("--cta-bg", FALLBACK.ink),
    muted: read("--text-muted", FALLBACK.muted),
    accent: read("--error", FALLBACK.accent),
  };
}

const DURATION_MS = 2400;

/**
 * Confetti button (studio request): a quiet celebration control. Clicking
 * fires a short canvas burst in the studio palette (ink, muted, one red
 * marker piece) from the button itself, flips the label to "Celebrated"
 * for a moment, and removes the canvas when the pieces land. Pure
 * client-side, no dependency, skipped under reduced motion.
 */
export function ConfettiButton({
  label = "Celebrate",
  hint = "small wins count",
  variant = "secondary",
  className,
}: ConfettiButtonProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const [celebrated, setCelebrated] = useState(false);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    canvasRef.current?.remove();
    canvasRef.current = null;
  }, []);

  useEffect(
    () => () => {
      stop();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [stop],
  );

  const fire = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    stop();
    const rect = anchor.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-confetti-canvas", "");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;z-index:70;pointer-events:none;";
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = readPalette();
    const colors = [palette.ink, palette.ink, palette.muted, palette.accent];
    const originX = (rect.left + rect.width / 2) * dpr;
    const originY = (rect.top + rect.height / 2) * dpr;
    const gravity = 0.34 * dpr;
    const drag = 0.988;

    const particles: Particle[] = Array.from({ length: 90 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      const speed = (7 + Math.random() * 9) * dpr;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.32,
        size: (4 + Math.random() * 5) * dpr,
        color: colors[Math.floor(Math.random() * colors.length)],
        round: Math.random() < 0.4,
        life: 1,
      };
    });

    let last = performance.now();
    const started = last;

    const tick = (now: number) => {
      const elapsed = now - started;
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      for (const particle of particles) {
        particle.vy += gravity * dt;
        particle.vx *= drag;
        particle.vy *= drag;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.rotation += particle.spin * dt;
        particle.life = Math.max(0, 1 - elapsed / DURATION_MS);
        if (particle.life > 0 && particle.y < canvas.height + 40 * dpr) {
          alive = true;
        }

        ctx.save();
        ctx.globalAlpha = Math.min(1, particle.life * 1.6);
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillStyle = particle.color;
        if (particle.round) {
          ctx.beginPath();
          ctx.arc(0, 0, particle.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(
            -particle.size / 2,
            -particle.size / 4,
            particle.size,
            particle.size / 2,
          );
        }
        ctx.restore();
      }

      if (alive && elapsed < DURATION_MS + 800) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        stop();
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [stop]);

  const handleClick = () => {
    fire();
    setCelebrated(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCelebrated(false), 2000);
  };

  return (
    <span
      ref={anchorRef}
      data-confetti-button
      className={cn("inline-flex flex-wrap items-center gap-3", className)}
    >
      <Button type="button" variant={variant} onClick={handleClick}>
        <span aria-live="polite">{celebrated ? "Celebrated" : label}</span>
      </Button>
      {hint ? (
        <span className="font-display text-caption italic text-muted">
          {hint}
        </span>
      ) : null}
    </span>
  );
}
