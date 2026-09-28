"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  WORK_FILTERS,
  type Project,
  type WorkFilter,
} from "@/lib/content/types";
import { MediaMasonry } from "@/components/media/media-masonry";
import { ProjectCard } from "./ProjectCard";
import { useFilterBarKeyboard } from "@/hooks/useFilterBarKeyboard";

interface WorkBrowserProps {
  projects: Project[];
  /** Deep link entry point for the Work dropdown (?filter=Photography). */
  initialFilter?: WorkFilter;
}

/**
 * Work listing with the 8 filters (§6.2), packed into the masonry grid.
 * Filters never create separate pages, they reflow the same grid; new
 * cards enter with the masonry reveal. The chosen filter is mirrored
 * into the URL so dropdown deep links and shared links land on the same
 * view.
 */
export function WorkBrowser({
  projects,
  initialFilter = "All",
}: WorkBrowserProps) {
  const [filter, setFilter] = useState<WorkFilter>(initialFilter);
  const router = useRouter();
  const { ref: filterBarRef, onKeyDown: onFilterKeyDown } =
    useFilterBarKeyboard();

  // Follow deep links that arrive while the page is already open.
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const counts = useMemo(() => {
    const map = new Map<WorkFilter, number>();
    for (const option of WORK_FILTERS) {
      map.set(
        option,
        option === "All"
          ? projects.length
          : projects.filter((project) => project.category === option).length,
      );
    }
    return map;
  }, [projects]);

  const visible = useMemo(
    () =>
      filter === "All"
        ? projects
        : projects.filter((project) => project.category === filter),
    [filter, projects],
  );

  const selectFilter = (next: WorkFilter) => {
    if (next === filter) return;
    setFilter(next);
    router.replace(next === "All" ? "/work" : `/work?filter=${next}`, {
      scroll: false,
    });
  };

  const summary = filter === "All" ? "All work" : filter;

  return (
    <section aria-label="Portfolio projects">
      <div className="sticky top-16 z-30 border-b border-line bg-background/95">
        <div className="container-editorial">
          <div className="relative">
            <div
              ref={filterBarRef}
              role="group"
              aria-label="Filter projects by category"
              onKeyDown={onFilterKeyDown}
              className="flex items-center gap-5 overflow-x-auto py-1 pr-10 [scrollbar-width:none] sm:[@media(min-height:500px)]:flex-wrap sm:[@media(min-height:500px)]:gap-x-7 sm:[@media(min-height:500px)]:gap-y-0 sm:[@media(min-height:500px)]:overflow-visible sm:[@media(min-height:500px)]:pr-0 [&::-webkit-scrollbar]:hidden"
            >
              {WORK_FILTERS.map((option) => {
                const active = option === filter;
                return (
                  <button
                    key={option}
                    type="button"
                    data-filter-tab
                    onClick={() => selectFilter(option)}
                    aria-pressed={active}
                    className={`min-h-11 shrink-0 border-b-2 pb-2 pt-3 text-nav font-medium transition-colors duration-300 ${
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted hover:text-secondary"
                    }`}
                  >
                    {option}
                    <span className="ml-1 text-label tabular-nums text-muted">
                      ({String(counts.get(option) ?? 0).padStart(2, "0")})
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Phones keep the single swipeable row; the fade marks the cut. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-background/95 to-transparent sm:[@media(min-height:500px)]:hidden"
            />
          </div>
        </div>
      </div>

      <div className="container-editorial">
        <p
          aria-live="polite"
          className="py-6 text-label uppercase tracking-label-wide text-muted"
        >
          {summary}, {String(visible.length).padStart(2, "0")}{" "}
          {visible.length === 1 ? "project" : "projects"}
        </p>

        <div>
          <MediaMasonry
            items={visible}
            label="Portfolio projects"
            revealKey={filter}
            getKey={(project) => project.slug}
            renderItem={(project, index) => (
              <ProjectCard project={project} index={index} />
            )}
          />

          {visible.length === 0 ? (
            <div className="border-t border-line py-20 text-center">
              <p className="font-display text-display-sm">
                No projects yet in this category.
              </p>
              <p className="mt-2 text-body-sm text-secondary">
                Explore the full archive, new projects are published
                regularly.
              </p>
              <button
                type="button"
                onClick={() => selectFilter("All")}
                className="mt-6 min-h-11 text-button font-medium text-primary underline underline-offset-4"
              >
                View all work
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
