"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_ITEMS, PRIMARY_CTA, SITE, WORK_MENU, type ContactChannel, type NavItem } from "@/lib/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { BrandLogo } from "@/components/site/BrandLogo";
import { NavDropdown } from "@/components/site/NavDropdown";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { KineticMenu } from "@/components/site/KineticMenu";

interface TopNavProps {
  /** Available contact channels from Global Settings (menu info block). */
  menuContacts: ContactChannel[];
  menuSocials: ContactChannel[];
  /** Studio tagline from Global Settings (menu head). */
  menuTagline: string;
  /** Primary menu items (CMS navigation, default menu as fallback). */
  menuItems: NavItem[];
}

/**
 * Top navigation on every breakpoint: brand, theme toggle, primary CTA and
 * the kinetic menu trigger. Navigation itself lives in the KineticMenu
 * drawer so the experience is identical on desktop, tablet, phone.
 */
export function TopNav({
  menuContacts,
  menuSocials,
  menuTagline,
  menuItems,
}: TopNavProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Stable surface after scroll, keeps text contrast over media (§31.13).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu when navigating.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
          open
            ? "border-line bg-background"
            : scrolled
              ? "border-line bg-background/95"
              : "border-transparent"
        }`}
      >
        <div className="container-editorial flex h-16 items-center justify-between gap-6">
          <Link
            href="/"
            aria-label={`${SITE.name}, home`}
            className="flex min-w-0 items-center gap-3 text-primary"
          >
            <BrandLogo
              variant="mark"
              className="shrink-0"
              imgClassName="h-7 w-7 object-contain"
            />
            <span className="truncate text-label font-semibold uppercase tracking-brand">
              {SITE.name}
            </span>
          </Link>

          {/* Inline navigation on desktop (§5); the drawer stays available
              on every breakpoint through the Menu button. */}
          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {NAV_ITEMS.map((item) =>
              item.href === "/work" ? (
                <NavDropdown
                  key={item.href}
                  item={item}
                  items={WORK_MENU}
                  active={isActive(item.href)}
                />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`text-nav font-medium transition-colors duration-300 ${
                    isActive(item.href)
                      ? "text-primary"
                      : "text-muted hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <ButtonLink
              href={PRIMARY_CTA.href}
              variant="primary"
              className="hidden sm:inline-flex"
            >
              {PRIMARY_CTA.label}
            </ButtonLink>
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              data-menu-trigger
              onClick={() => setOpen((value) => !value)}
              className="group flex min-h-11 items-center gap-2 rounded-pill px-3 text-label font-semibold uppercase tracking-brand text-primary transition-colors duration-300 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong"
            >
              <span
                aria-hidden
                className="relative hidden h-5 overflow-hidden sm:block"
              >
                {/* Two stacked labels rolled by exactly one line (50% of the
                    40px column), so "Close" lands inside the 20px window. */}
                <span
                  className={`block transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    open ? "-translate-y-1/2" : ""
                  }`}
                >
                  <span className="block h-5 leading-5">Menu</span>
                  <span className="block h-5 leading-5">Close</span>
                </span>
              </span>
              <svg
                aria-hidden
                className={`h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  open ? "rotate-45" : ""
                }`}
                viewBox="0 0 16 16"
                fill="none"
              >
                <path d="M7.33 0h1.34v16H7.33z" fill="currentColor" />
                <path d="M0 7.33h16v1.34H0z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <KineticMenu
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        panelRef={panelRef}
        menuContacts={menuContacts}
        menuSocials={menuSocials}
        menuTagline={menuTagline}
        menuItems={menuItems}
      />
    </>
  );
}
