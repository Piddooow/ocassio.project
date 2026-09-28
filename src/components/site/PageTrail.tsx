"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/cn";

export type Crumb = { label: string; href: string };

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
// Segments slide over to close the gap at UI speed, with no bounce: a trail
// that overshoots reads as unstable.
const SLIDE = { type: "spring", visualDuration: 0.25, bounce: 0 } as const;
const INSTANT = { duration: 0 } as const;
const ENTER = { duration: 0.2, ease: EASE_OUT };
// Leaving segments go faster than arriving ones, so the gap they leave is
// already closing by the time the eye looks for it.
const EXIT = { duration: 0.12, ease: EASE_OUT };
const MENU_ENTER = { duration: 0.18, ease: EASE_OUT };
const MENU_EXIT = { duration: 0.1, ease: EASE_OUT };

// Only detail pages carry the trail; the top-level pages stay clean.
const SUB_PAGE = /\/(work|journal|services)\/[^/]+$/;
const PARENT: Record<string, Crumb> = {
  work: { label: "Work", href: "/work" },
  journal: { label: "Journal", href: "/journal" },
  services: { label: "Services", href: "/services" },
};
const TRAIL_KEY = "ocassio:trail";
const TRAIL_LIMIT = 6;

/**
 * Page trail (§ studio request, adapted from the provided Breadcrumbs):
 * detail pages record where the reader has been this session and offer
 * the quiet crumb path back, so deep navigation never feels like a dead
 * end. The crumb bar now also takes the place of the old per-page back
 * links, so detail heroes stay clean.
 */
export function PageTrail() {
  const pathname = usePathname();
  const router = useRouter();
  const [items, setItems] = useState<Crumb[]>([]);

  useEffect(() => {
    if (!SUB_PAGE.test(pathname)) {
      setItems([]);
      return;
    }
    let trail: Crumb[] = [];
    try {
      trail = JSON.parse(sessionStorage.getItem(TRAIL_KEY) ?? "[]") as Crumb[];
      if (!Array.isArray(trail)) trail = [];
    } catch {
      trail = [];
    }
    const section = pathname.split("/")[1];
    const parent = PARENT[section];
    if (parent && trail.length === 0) {
      trail = [parent];
    }
    if (parent && trail.length > 0 && trail[0]?.href !== parent.href) {
      trail = [parent, ...trail];
    }
    const title =
      document.title.split(" · ")[0]?.trim() || pathname.split("/").pop() || "";
    const seen = trail.findIndex((crumb) => crumb.href === pathname);
    if (seen !== -1) {
      trail = trail.slice(0, seen + 1);
    } else {
      trail = [...trail, { label: title, href: pathname }];
    }
    trail = trail.slice(-TRAIL_LIMIT);
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
    setItems(trail);
  }, [pathname]);

  if (items.length === 0) return null;

  return (
    <div className="container-editorial flex min-w-0 items-center py-3">
      <Trail items={items} onNavigate={(item) => router.push(item.href)} />
    </div>
  );
}

/*
 * Fitting works off a hidden copy of the full trail, so the widths never
 * depend on what is currently folded and the decision can't oscillate.
 * The first segment and the current page always stay; middle segments fold
 * into the menu from the left, so the nearest parents stay visible longest.
 */
function Trail({
  items,
  onNavigate,
}: {
  items: readonly Crumb[];
  onNavigate?: (item: Crumb, index: number) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const navRef = useRef<HTMLElement>(null);
  const rulerRef = useRef<HTMLOListElement>(null);
  const [start, setStart] = useState(1);

  useEffect(() => {
    const nav = navRef.current;
    const ruler = rulerRef.current;
    if (!nav || !ruler) return;

    const fit = () => {
      const widths = [...ruler.children].map(
        (node) => node.getBoundingClientRect().width,
      );
      const fold = widths.pop() ?? 0;
      const count = widths.length;
      const available = nav.clientWidth;
      let next = Math.max(count - 1, 1);
      let tail = widths.slice(1).reduce((a, b) => a + b, 0);
      for (let k = 1; k < count; k++) {
        // Half a pixel of slack absorbs subpixel rounding between the ruler
        // and the live row.
        if (widths[0] + (k > 1 ? fold : 0) + tail <= available + 0.5) {
          next = k;
          break;
        }
        tail -= widths[k];
      }
      setStart(next);
    };

    const observer = new ResizeObserver(fit);
    observer.observe(nav);
    observer.observe(ruler);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) fit();
    });
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [items]);

  const last = items.length - 1;
  const folded = Math.min(start, Math.max(last, 1));
  const hidden = items.slice(1, folded);
  const layout = reduce ? INSTANT : SLIDE;
  const reveal = {
    initial: { opacity: 0, filter: reduce ? "blur(0px)" : "blur(4px)" },
    animate: { opacity: 1, filter: "blur(0px)", transition: ENTER },
    exit: { opacity: 0, filter: "blur(0px)", transition: EXIT },
    transition: { layout },
    layout: "position" as const,
    layoutDependency: folded,
  };

  const segments: ReactNode[] = [];
  items.forEach((item, index) => {
    if (index !== 0 && index < folded) return;
    segments.push(
      <motion.li
        key={item.href}
        {...reveal}
        className={cn(
          "flex items-center",
          index === last ? "min-w-0" : "shrink-0",
        )}
      >
        {index > 0 && <Separator />}
        {index === last ? (
          // The current page is text, not a link: it can't take you anywhere.
          <span
            aria-current="page"
            className="block truncate px-1.5 text-caption font-medium text-primary"
          >
            {item.label}
          </span>
        ) : (
          <a
            href={item.href}
            onClick={(event) => {
              if (!onNavigate) return;
              event.preventDefault();
              onNavigate(item, index);
            }}
            className="inline-flex h-9 touch-manipulation items-center rounded-md px-1.5 text-caption whitespace-nowrap text-muted underline decoration-transparent underline-offset-4 outline-hidden transition-[color,text-decoration-color] duration-150 ease-out select-none hover:text-primary hover:decoration-line-strong focus-visible:outline-2 focus-visible:outline-line-strong"
          >
            {item.label}
          </a>
        )}
      </motion.li>,
    );
    if (index === 0 && hidden.length > 0) {
      segments.push(
        <motion.li key="fold" {...reveal} className="flex shrink-0 items-center">
          <Separator />
          <FoldMenu items={hidden} onNavigate={onNavigate} />
        </motion.li>,
      );
    }
  });

  return (
    <nav
      ref={navRef}
      aria-label="Page trail"
      className="relative w-full min-w-0"
    >
      <ol
        ref={rulerRef}
        aria-hidden
        inert
        className="pointer-events-none invisible absolute top-0 left-0 flex max-w-full items-center overflow-hidden whitespace-nowrap"
      >
        {items.map((item, index) => (
          <li key={item.href} className="flex shrink-0 items-center">
            {index > 0 && <Separator />}
            <span
              className={cn(
                "px-1.5 text-caption",
                index === last && "font-medium",
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
        <li className="flex shrink-0 items-center">
          <Separator />
          <span className="block w-9" />
        </li>
      </ol>

      <ol className="relative flex h-9 min-w-0 items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {segments}
        </AnimatePresence>
      </ol>
    </nav>
  );
}

function Separator() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="size-4 shrink-0 text-muted/50"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M10 3 6 13" />
    </svg>
  );
}

function FoldMenu({
  items,
  onNavigate,
}: {
  items: readonly Crumb[];
  onNavigate?: (item: Crumb, index: number) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const focusFirst = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (focusFirst.current) itemRefs.current[0]?.focus({ preventScroll: true });
    else menuRef.current?.focus({ preventScroll: true });
  }, [open]);

  const count = items.length;

  const openMenu = (first: boolean) => {
    focusFirst.current = first;
    setOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const focusAt = (index: number) =>
    itemRefs.current[(index + count) % count]?.focus({ preventScroll: true });

  const move = (step: number) => {
    const at = itemRefs.current.indexOf(
      document.activeElement as HTMLAnchorElement,
    );
    focusAt(at === -1 ? (step > 0 ? 0 : -1) : at + step);
  };

  return (
    <span ref={rootRef} className="relative flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Show ${count} hidden ${count === 1 ? "step" : "steps"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={(event) => {
          if (open) close(false);
          // detail is 0 for keyboard and assistive tech clicks, which want
          // focus on the first item rather than on the menu itself.
          else openMenu(event.detail === 0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(true);
          }
        }}
        className={cn(
          "flex h-8 w-9 touch-manipulation items-center justify-center rounded-md text-muted outline-hidden transition-[color,background-color] duration-150 ease-out select-none hover:bg-surface-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-line-strong",
          open && "bg-surface-hover text-primary",
        )}
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="size-4"
          fill="currentColor"
        >
          <circle cx="3.5" cy="8" r="1.25" />
          <circle cx="8" cy="8" r="1.25" />
          <circle cx="12.5" cy="8" r="1.25" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <Menu
            ref={menuRef}
            id={`${id}-menu`}
            reduce={reduce}
            onKeyDown={(event) => {
              switch (event.key) {
                case "ArrowDown":
                  event.preventDefault();
                  move(1);
                  return;
                case "ArrowUp":
                  event.preventDefault();
                  move(-1);
                  return;
                case "Home":
                  event.preventDefault();
                  focusAt(0);
                  return;
                case "End":
                  event.preventDefault();
                  focusAt(-1);
                  return;
                case "Escape":
                  event.preventDefault();
                  close(true);
                  return;
                case "Tab":
                  // Focus moves on as usual; the menu just gets out of the way.
                  close(false);
              }
            }}
            onBlur={(event) => {
              // Covers clicking outside, tabbing away and leaving the window.
              if (
                !rootRef.current?.contains(event.relatedTarget as Node | null)
              ) {
                close(false);
              }
            }}
          >
            {items.map((item, index) => (
              <a
                key={item.href}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                onPointerMove={(event) => {
                  if (event.pointerType === "touch") return;
                  if (document.activeElement !== event.currentTarget) {
                    event.currentTarget.focus({ preventScroll: true });
                  }
                }}
                onClick={(event) => {
                  if (onNavigate) {
                    event.preventDefault();
                    // Hidden segments start right after the first one.
                    onNavigate(item, index + 1);
                  }
                  close(true);
                }}
                // No transition on the highlight: it follows every hover, so
                // any easing reads as lag.
                className="flex h-9 cursor-default items-center gap-2.5 rounded-lg px-2 text-caption text-primary outline-hidden select-none focus:bg-surface-hover"
              >
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden
                  className="size-4 shrink-0 text-muted"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                >
                  <path d="M2.25 4.5c0-.69.56-1.25 1.25-1.25h2.6l1.4 1.5h5c.69 0 1.25.56 1.25 1.25v5.5c0 .69-.56 1.25-1.25 1.25h-9c-.69 0-1.25-.56-1.25-1.25Z" />
                </svg>
                <span className="truncate">{item.label}</span>
              </a>
            ))}
          </Menu>
        )}
      </AnimatePresence>
    </span>
  );
}

function Menu({
  ref,
  id,
  reduce,
  onKeyDown,
  onBlur,
  children,
}: {
  ref: React.Ref<HTMLDivElement>;
  id: string;
  reduce: boolean;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onBlur: (event: React.FocusEvent) => void;
  children: ReactNode;
}) {
  // A closing menu stops taking pointer input at once, so it never blocks
  // the next click while it fades.
  const isPresent = useIsPresent();
  return (
    <motion.div
      ref={ref}
      id={id}
      role="menu"
      aria-label="Hidden steps"
      tabIndex={-1}
      initial={{ opacity: 0, transform: reduce ? "scale(1)" : "scale(0.95)" }}
      animate={{ opacity: 1, transform: "scale(1)", transition: MENU_ENTER }}
      exit={{
        opacity: 0,
        transform: reduce ? "scale(1)" : "scale(0.97)",
        transition: MENU_EXIT,
      }}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      // Grows out of the dots: 18px is the centre of the 36px trigger.
      style={{ transformOrigin: "18px 0" }}
      className={cn(
        "absolute top-full left-0 z-50 mt-1.5 w-48 rounded-xl border border-line bg-background p-1 shadow-[var(--shadow-drawer)] outline-hidden",
        !isPresent && "pointer-events-none",
      )}
    >
      {children}
    </motion.div>
  );
}
