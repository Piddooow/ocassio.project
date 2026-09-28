"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  FOOTER_MORE,
  PRIMARY_CTA,
  WORK_MENU,
  type ContactChannel,
  type NavItem,
} from "@/lib/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ThemeToggle } from "@/components/site/ThemeToggle";

interface KineticMenuProps {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  menuContacts: ContactChannel[];
  menuSocials: ContactChannel[];
  menuTagline: string;
  menuItems: NavItem[];
}

/**
 * Kinetic menu (studio request, adapted from the reference site): a
 * right-side drawer over a dimmed scrim. Three tone layers slide in from
 * the right, the numbered links rise from masks with a hover/active
 * underline, and the info block carries the real contact channels,
 * secondary links, CTA and theme toggle. Timelines run only while opening
 * or closing; reduced motion gets an instant swap; clicking the scrim,
 * the close button, or Escape closes it.
 */
export function KineticMenu({
  open,
  onClose,
  triggerRef,
  panelRef,
  menuContacts,
  menuSocials,
  menuTagline,
  menuItems,
}: KineticMenuProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || !mounted) return;

      const scrim = root.querySelector("[data-menu-scrim]");
      const content = root.querySelector("[data-menu-scroll]");
      const layers = gsap.utils.toArray<HTMLElement>("[data-menu-layer]", root);
      const items = gsap.utils.toArray<HTMLElement>("[data-menu-item]", root);
      const links = gsap.utils.toArray<HTMLElement>("[data-menu-link]", root);
      const fades = gsap.utils.toArray<HTMLElement>("[data-menu-fade]", root);
      const shapes = gsap.utils.toArray<HTMLElement>("[data-menu-shape]", root);

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (open) {
          const timeline = gsap.timeline();
          timeline
            .fromTo(
              scrim,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.3, ease: "power2.out" },
              0,
            )
            .fromTo(
              layers,
              { xPercent: 101 },
              {
                xPercent: 0,
                duration: 0.575,
                stagger: 0.12,
                ease: "power3.out",
              },
              0,
            )
            .fromTo(
              content,
              { xPercent: 6, autoAlpha: 0 },
              {
                xPercent: 0,
                autoAlpha: 1,
                duration: 0.5,
                ease: "power3.out",
              },
              0.28,
            )
            .fromTo(
              links,
              { yPercent: 140, rotate: 3 },
              {
                yPercent: 0,
                rotate: 0,
                duration: 0.6,
                stagger: 0.05,
                ease: "power3.out",
              },
              0.42,
            )
            .fromTo(
              fades,
              { autoAlpha: 0, yPercent: 40 },
              {
                autoAlpha: 1,
                yPercent: 0,
                duration: 0.5,
                stagger: 0.06,
                ease: "power3.out",
              },
              0.55,
            );

          const showShape = (index: number) => {
            const target = shapes[index % shapes.length];
            if (!target) return;
            gsap.to(shapes, {
              autoAlpha: 0,
              scale: 0.98,
              duration: 0.25,
              overwrite: "auto",
            });
            gsap.fromTo(
              target,
              { autoAlpha: 0, scale: 0.96 },
              {
                autoAlpha: 1,
                scale: 1,
                duration: 0.5,
                delay: 0.05,
                overwrite: "auto",
              },
            );
          };
          const hideShapes = () =>
            gsap.to(shapes, { autoAlpha: 0, duration: 0.3, overwrite: "auto" });

          // Hover runs through GSAP (studio request): the underline draws
          // with quickTo and the label leans a few pixels right, both on the
          // same ease so the row moves like one object.
          const hovers = items.map((element) => {
            const link = element.querySelector<HTMLElement>("[data-menu-link]");
            const underline = element.querySelector<HTMLElement>(
              "[data-menu-underline]",
            );
            if (!link || !underline) {
              return { enter: () => {}, leave: () => {}, cleanup: () => {} };
            }
            const isActive = Boolean(
              element.querySelector('a[aria-current="page"]'),
            );
            gsap.set(underline, {
              scaleX: isActive ? 1 : 0,
              transformOrigin: "left center",
            });
            const underlineTo = gsap.quickTo(underline, "scaleX", {
              duration: 0.35,
              ease: "power3.out",
            });
            const labelTo = gsap.quickTo(link, "x", {
              duration: 0.35,
              ease: "power3.out",
            });
            return {
              enter: () => {
                underlineTo(1);
                labelTo(6);
              },
              leave: () => {
                underlineTo(isActive ? 1 : 0);
                labelTo(0);
              },
              cleanup: () => {
                gsap.set(link, { x: 0 });
                gsap.set(underline, { scaleX: isActive ? 1 : 0 });
              },
            };
          });

          const cleanups = items.map((element, index) => {
            const hover = hovers[index];
            const onEnter = () => {
              showShape(index);
              hover?.enter();
            };
            const onLeave = () => {
              hideShapes();
              hover?.leave();
            };
            element.addEventListener("mouseenter", onEnter);
            element.addEventListener("mouseleave", onLeave);
            return () => {
              element.removeEventListener("mouseenter", onEnter);
              element.removeEventListener("mouseleave", onLeave);
              hover?.cleanup();
            };
          });

          return () => {
            timeline.kill();
            cleanups.forEach((cleanup) => cleanup());
          };
        }

        // Closing is the entrance played in reverse with the exact same
        // durations, eases and staggers (last item leaves first), so the
        // drawer returns the way it arrived. The content clears before the
        // layers slide, so nothing floats over the page.
        const closing = gsap.timeline({
          onComplete: () => setMounted(false),
        });
        closing
          .to(
            content,
            { xPercent: 6, autoAlpha: 0, duration: 0.5, ease: "power3.in" },
            0,
          )
          .to(
            links,
            {
              yPercent: 140,
              rotate: 3,
              duration: 0.6,
              stagger: { each: 0.05, from: "end" },
              ease: "power3.in",
            },
            0,
          )
          .to(
            fades,
            {
              autoAlpha: 0,
              yPercent: 40,
              duration: 0.5,
              stagger: { each: 0.06, from: "end" },
              ease: "power3.in",
            },
            0,
          )
          .to(
            layers,
            {
              xPercent: 101,
              duration: 0.575,
              stagger: { each: 0.12, from: "end" },
              ease: "power3.in",
            },
            0.5,
          )
          .to(scrim, { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, 0.55);
        return () => closing.kill();
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (!open) {
          setMounted(false);
          return;
        }
        // No tweens, but the underline still marks the current page and
        // starts hidden everywhere else.
        items.forEach((element) => {
          const underline = element.querySelector<HTMLElement>(
            "[data-menu-underline]",
          );
          if (!underline) return;
          gsap.set(underline, {
            scaleX: element.querySelector('a[aria-current="page"]') ? 1 : 0,
            transformOrigin: "left center",
          });
        });
      });

      return () => mm.revert();
    },
    { dependencies: [open, mounted], scope: rootRef, revertOnUpdate: true },
  );

  // Escape, focus handling and scroll lock while the menu is open.
  useEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    panel
      ?.querySelector<HTMLElement>("a[href], button:not([disabled])")
      ?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open, mounted, onClose, panelRef, triggerRef]);

  if (!mounted) return null;

  return (
    <div
      ref={rootRef}
      // Sits below the header (z-40 vs header z-50) so the navbar stays
      // crisp and unblurred while the drawer is open, and the same Menu
      // button can close it again.
      className="fixed inset-x-0 bottom-0 top-16 z-40 flex justify-end"
    >
      <div
        data-menu-scrim
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-background-deep/55 backdrop-blur-md"
      />

      <div
        ref={panelRef}
        id="mobile-menu"
        className="relative flex h-full w-[92vw] flex-col sm:w-[30rem] lg:w-[34vw] lg:max-w-[560px]"
      >
        <div
          data-menu-layer
          aria-hidden
          className="absolute inset-0 bg-background-deep"
        />
        <div
          data-menu-layer
          aria-hidden
          className="absolute inset-0 bg-surface"
        />
        <div
          data-menu-layer
          aria-hidden
          className="absolute inset-0 bg-surface"
          style={{
            backgroundImage:
              "radial-gradient(120% 90% at 85% 10%, color-mix(in srgb, var(--cta-bg) 8%, transparent) 0%, transparent 55%)",
          }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden text-primary"
        >
          <svg
            data-menu-shape="0"
            className="absolute -right-28 top-[-10%] h-[420px] w-[420px] opacity-0"
            viewBox="0 0 400 400"
            fill="none"
          >
            <circle cx="200" cy="200" r="70" stroke="currentColor" strokeOpacity="0.14" strokeWidth="2" />
            <circle cx="200" cy="200" r="130" stroke="currentColor" strokeOpacity="0.09" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="185" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
          </svg>
          <svg
            data-menu-shape="1"
            className="absolute -left-28 bottom-[-12%] h-[420px] w-[420px] opacity-0"
            viewBox="0 0 400 400"
            fill="none"
          >
            <path d="M20 300 Q120 180, 220 300 T 380 300" stroke="currentColor" strokeOpacity="0.1" strokeWidth="24" />
            <path d="M20 240 Q120 120, 220 240 T 380 240" stroke="currentColor" strokeOpacity="0.06" strokeWidth="16" />
          </svg>
          <svg
            data-menu-shape="2"
            className="absolute left-[6%] top-[26%] h-[320px] w-[320px] opacity-0"
            viewBox="0 0 400 400"
            fill="none"
          >
            {Array.from({ length: 5 }, (_, row) =>
              Array.from({ length: 5 }, (_, column) => (
                <circle
                  key={`${row}-${column}`}
                  cx={60 + column * 70}
                  cy={60 + row * 70}
                  r={row === 2 && column === 2 ? 12 : 6}
                  fill="currentColor"
                  fillOpacity="0.1"
                />
              )),
            )}
          </svg>
          <svg
            data-menu-shape="3"
            className="absolute bottom-[-6%] right-[-10%] h-[380px] w-[380px] opacity-0"
            viewBox="0 0 400 400"
            fill="none"
          >
            <line x1="0" y1="120" x2="300" y2="400" stroke="currentColor" strokeOpacity="0.1" strokeWidth="22" />
            <line x1="80" y1="0" x2="400" y2="300" stroke="currentColor" strokeOpacity="0.06" strokeWidth="14" />
          </svg>
        </div>

        <div
          data-menu-scroll
          className="relative flex h-full flex-col justify-between gap-10 overflow-y-auto overscroll-contain px-6 py-7 sm:px-10 sm:py-9"
        >
          <div>
            <p
              data-menu-fade
              className="text-label uppercase tracking-label-wide text-muted"
            >
              Menu
            </p>
            <p
              data-menu-fade
              className="mt-3 max-w-[17rem] font-display text-display-sm text-secondary"
            >
              {menuTagline}
            </p>

            <nav aria-label="Menu" className="mt-10">
              <ul className="flex flex-col">
                {menuItems.map((item, index) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href} data-menu-item className="overflow-hidden">
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className="group relative flex items-baseline gap-4 py-1.5"
                      >
                        <span
                          aria-hidden
                          data-menu-index
                          className="text-caption tabular-nums text-muted"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          data-menu-link
                          className="block font-display text-[2.05rem] leading-[1.1] tracking-[-0.01em] text-primary sm:text-[2.35rem]"
                        >
                          {item.label}
                        </span>
                        <span
                          aria-hidden
                          data-menu-underline
                          className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-cta"
                        />
                      </Link>
                      {item.href === "/work" ? (
                        <div
                          data-menu-sub
                          className="mb-2 flex flex-wrap gap-x-4 gap-y-1 pl-9"
                        >
                          {WORK_MENU.map((entry) => (
                            <Link
                              key={entry.href}
                              href={entry.href}
                              data-menu-sublink
                              className="text-caption text-muted transition-colors duration-300 hover:text-primary"
                            >
                              {entry.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="flex flex-col gap-8">
            {menuContacts.length > 0 || menuSocials.length > 0 ? (
              <div data-menu-info data-menu-fade className="flex flex-col gap-6">
                {menuContacts.length > 0 ? (
                  <div data-menu-contacts className="flex flex-col gap-2">
                    <p className="text-label uppercase tracking-label-wide text-muted">
                      Contact
                    </p>
                    {menuContacts.map((channel) => (
                      <a
                        key={channel.label}
                        href={channel.href}
                        className="text-body-sm text-secondary transition-colors duration-300 hover:text-primary"
                      >
                        {channel.label === "General email"
                          ? channel.value
                          : `${channel.label} · ${channel.value ?? ""}`}
                      </a>
                    ))}
                  </div>
                ) : null}
                {menuSocials.length > 0 ? (
                  <div
                    data-menu-socials
                    className="flex flex-wrap items-center gap-x-5 gap-y-2"
                  >
                    {menuSocials.map((channel) => (
                      <a
                        key={channel.label}
                        href={channel.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-label uppercase tracking-label-wide text-muted transition-colors duration-300 hover:text-primary"
                      >
                        {channel.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              data-menu-fade
              className="flex flex-col gap-5 border-t border-line pt-6"
            >
              <div
                data-menu-secondary
                className="flex items-center gap-6"
              >
                {FOOTER_MORE.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-body-sm text-muted transition-colors duration-300 hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <ButtonLink href={PRIMARY_CTA.href} variant="primary">
                  {PRIMARY_CTA.label}
                </ButtonLink>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
