"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

interface HoverCardProps {
  name: string;
  role: string;
  bio?: string | null;
  className?: string;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Team hover card (studio request): the roster row stays a quiet list
 * item, and hovering (or focusing) the name opens a small card with the
 * initials avatar, role, and bio. Pointer, keyboard, and tap all work;
 * Escape closes. No fabricated portraits, initials only.
 */
export function HoverCard({ name, role, bio, className }: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const cardId = useId();

  return (
    <span
      className={cn("relative inline-flex max-w-full", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        data-hover-card-trigger
        aria-expanded={open}
        aria-describedby={open ? cardId : undefined}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="group flex min-w-0 items-center gap-3 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-line"
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-label font-semibold uppercase tracking-label-wide text-secondary transition-colors group-hover:border-primary group-hover:text-primary"
        >
          {initialsOf(name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body-sm font-medium text-primary underline-offset-4 group-hover:underline">
            {name}
          </span>
          <span className="mt-0.5 block text-caption text-muted">{role}</span>
        </span>
      </button>

      <span
        id={cardId}
        role="tooltip"
        data-hover-card
        className={cn(
          "absolute left-0 top-full z-30 mt-3 w-72 max-w-[80vw] rounded-2xl border border-line bg-surface p-5 shadow-elevated transition-all duration-200 motion-reduce:transition-none",
          open
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-1 opacity-0",
        )}
      >
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-background text-label font-semibold uppercase tracking-label-wide text-primary"
          >
            {initialsOf(name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body-sm font-medium text-primary">
              {name}
            </span>
            <span className="block text-caption text-muted">{role}</span>
          </span>
        </span>
        {bio ? (
          <span className="mt-4 block text-body-sm text-secondary">{bio}</span>
        ) : (
          <span className="mt-4 block text-body-sm text-muted">
            A longer bio is on the way.
          </span>
        )}
      </span>
    </span>
  );
}
