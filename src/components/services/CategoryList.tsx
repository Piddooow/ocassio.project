"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Film,
  Layers,
  Megaphone,
  Package,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryListItem {
  slug: string;
  title: string;
  description: string;
  serviceType: string;
}

const ICONS: Record<string, LucideIcon> = {
  Photography: Camera,
  "Film & Motion": Film,
  "Commercial Campaign": Megaphone,
  Portrait: UserRound,
  Product: Package,
  Event: CalendarDays,
  "Creative Production": Layers,
};

function CornerBrackets() {
  return (
    <>
      <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line-strong" />
      <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line-strong" />
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line-strong" />
      <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line-strong" />
    </>
  );
}

/**
 * Services category index (studio request): an interactive,
 * theme-adaptive list that navigates through the services. Hover or
 * keyboard focus expands a row, reveals corner brackets, and lifts the
 * arrow; the description stays readable on touch devices.
 */
export function CategoryList({ items }: { items: CategoryListItem[] }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <ul data-category-list className="flex flex-col">
      {items.map((item, index) => {
        const Icon = ICONS[item.serviceType] ?? Layers;
        const isActive = active === index;
        return (
          <li key={item.slug}>
            <Link
              href={`/services/${item.slug}`}
              data-category-item={item.slug}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              className={cn(
                "group relative block border-b border-line px-2 py-5 transition-colors duration-500 first:border-t sm:px-4",
                isActive && "bg-surface-hover/60",
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <CornerBrackets />
              </span>
              <span className="relative flex items-center gap-4 lg:gap-6">
                <span className="w-8 shrink-0 text-label tabular-nums tracking-label-wide text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon
                  aria-hidden
                  className="h-[18px] w-[18px] shrink-0 text-secondary transition-colors duration-500 group-hover:text-primary group-focus-visible:text-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-display-sm transition-transform duration-500 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1">
                    {item.title}
                  </span>
                  <span className="mt-1 block max-w-xl text-caption text-muted">
                    {item.description}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-muted transition-all duration-500 ease-out group-hover:translate-x-0.5 group-hover:text-primary group-focus-visible:translate-x-0.5 group-focus-visible:text-primary"
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
