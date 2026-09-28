"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_NAV } from "@/lib/admin";
import { BrandLogo } from "@/components/site/BrandLogo";

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Breadcrumb from the route: Admin / Website / Homepage. */
function breadcrumb(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((part) =>
    part
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  );
}

interface AdminShellProps {
  user: { name: string; roleLabel: string; role: string };
  children: React.ReactNode;
}

/**
 * Admin CMS shell (§31.30): persistent sidebar on desktop, drawer on small
 * screens, header with breadcrumb, the signed-in user, sign out, and a
 * way back to the public site. Light-first, compact, text labels
 * mandatory.
 */
export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch {
      /* The cookie clears client-side state on the redirect either way. */
    }
    router.push("/admin/sign-in");
    router.refresh();
  };

  /* Permission-aware nav rendering (§27): owners-only items stay hidden. */
  const nav = ADMIN_NAV.filter(
    (item) => item.href !== "/admin/users" || user.role === "owner",
  );

  const sidebar = (
    <nav aria-label="Admin" className="flex flex-col gap-6 p-5">
      {nav.map((item) => (
        <div key={item.label}>
          {item.href ? (
            <Link
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`block text-body-sm font-medium transition-colors ${
                isActive(pathname, item.href)
                  ? "text-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <p className="text-label uppercase tracking-label-wide text-muted">
              {item.label}
            </p>
          )}
          {item.children ? (
            <ul className="mt-3 flex flex-col gap-2 border-l border-line pl-4">
              {item.children.map((child) => (
                <li key={child.label}>
                  {child.href ? (
                    <Link
                      href={child.href}
                      aria-current={
                        isActive(pathname, child.href) ? "page" : undefined
                      }
                      className={`block text-body-sm transition-colors ${
                        isActive(pathname, child.href)
                          ? "font-medium text-primary"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ) : (
                    <span className="block text-body-sm text-muted">
                      {child.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </nav>
  );

  const segments = breadcrumb(pathname);

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto">
        <div className="border-b border-line px-5 py-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-primary"
            aria-label="Ocassio.Project admin, dashboard"
          >
            <BrandLogo
              variant="mark"
              className="shrink-0"
              imgClassName="h-6 w-6 object-contain"
            />
            <span className="text-label font-semibold uppercase tracking-brand">
              Admin
            </span>
          </Link>
        </div>
        {sidebar}
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-background-deep/50"
          />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-surface shadow-drawer">
            <div className="border-b border-line px-5 py-4">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-primary"
                aria-label="Ocassio.Project admin, dashboard"
              >
                <BrandLogo
                  variant="mark"
                  className="shrink-0"
                  imgClassName="h-6 w-6 object-contain"
                />
                <span className="text-label font-semibold uppercase tracking-brand">
                  Admin
                </span>
              </Link>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-line bg-background px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              className="min-h-11 text-label font-semibold uppercase tracking-label-wide text-primary lg:hidden"
            >
              Menu
            </button>
            <p className="text-caption text-muted" aria-label="Breadcrumb">
              {segments.join(" / ")}
            </p>
          </div>
          <div className="flex items-center gap-3 lg:gap-5">
            <span className="hidden text-caption text-muted sm:block">
              {user.name} · {user.roleLabel}
            </span>
            <Link
              href="/admin/account"
              className="text-body-sm font-medium text-secondary transition-colors hover:text-primary"
            >
              Account
            </Link>
            <button
              type="button"
              data-sign-out
              onClick={signOut}
              disabled={signingOut}
              className="text-body-sm font-medium text-secondary transition-colors hover:text-primary disabled:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-body-sm font-medium text-secondary transition-colors hover:text-primary"
            >
              View site ↗
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
