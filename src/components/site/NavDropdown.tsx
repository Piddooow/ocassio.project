"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/site";

interface NavDropdownProps {
  item: NavItem;
  items: NavItem[];
  active: boolean;
}

/**
 * Primary navigation dropdown (studio request): the Work entry opens a
 * small editorial panel with the sitemap children (All Work, Photography,
 * Film). Pointer intent opens it, focus opens it for keyboard users,
 * Escape and outside clicks close it, and the trigger itself still
 * navigates to /work. Reduced motion swaps the slide for an instant
 * panel. Only one dropdown exists today; the id stays stable for tests.
 */
export function NavDropdown({ item, items, active }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reduce = useReducedMotion();

  const openNow = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      data-nav-dropdown
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <Link
        href={item.href}
        aria-expanded={open}
        aria-controls="nav-dropdown-work"
        className={cn(
          "flex items-center gap-1.5 text-nav font-medium outline-hidden transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-line-strong",
          active || open ? "text-primary" : "text-muted hover:text-primary",
        )}
      >
        {item.label}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={cn(
            "size-3 transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </Link>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="nav-dropdown-work"
            data-nav-dropdown-panel
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduce ? 0.01 : 0.16, ease: "easeOut" }}
            className="absolute top-full left-1/2 z-50 mt-4 w-48 -translate-x-1/2 rounded-xl border border-line bg-background p-1.5 shadow-[var(--shadow-drawer)]"
          >
            <ul className="flex flex-col">
              {items.map((entry) => (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    data-nav-dropdown-item
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3.5 py-2.5 text-body-sm text-secondary transition-colors duration-200 hover:bg-surface-hover hover:text-primary focus-visible:bg-surface-hover focus-visible:text-primary focus-visible:outline-hidden"
                  >
                    {entry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
