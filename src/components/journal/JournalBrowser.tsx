"use client";

import { useMemo, useState } from "react";
import {
  JOURNAL_CATEGORIES,
  type Article,
  type JournalCategory,
} from "@/lib/content/journal";
import { MediaMasonry } from "@/components/media/media-masonry";
import { JournalCard } from "@/components/journal/JournalCard";
import { Button } from "@/components/ui/Button";
import { useFilterBarKeyboard } from "@/hooks/useFilterBarKeyboard";

type FeedFilter = "All" | JournalCategory;

const FEED_FILTERS: FeedFilter[] = ["All", ...JOURNAL_CATEGORIES];

const PAGE_SIZE = 4;

interface JournalBrowserProps {
  articles: Article[];
}

/**
 * Journal feed with category filters and progressive paging (§6.9),
 * packed into the masonry grid. Filters never create separate pages,
 * they reflow the same feed; new covers enter with the masonry reveal.
 */
export function JournalBrowser({ articles }: JournalBrowserProps) {
  const [filter, setFilter] = useState<FeedFilter>("All");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { ref: filterBarRef, onKeyDown: onFilterKeyDown } =
    useFilterBarKeyboard();

  const counts = useMemo(() => {
    const map = new Map<FeedFilter, number>();
    for (const option of FEED_FILTERS) {
      map.set(
        option,
        option === "All"
          ? articles.length
          : articles.filter((article) => article.category === option).length,
      );
    }
    return map;
  }, [articles]);

  const visible = useMemo(
    () =>
      filter === "All"
        ? articles
        : articles.filter((article) => article.category === filter),
    [filter, articles],
  );

  const shown = useMemo(() => visible.slice(0, limit), [visible, limit]);
  const shownCount = shown.length;

  const selectFilter = (next: FeedFilter) => {
    if (next === filter) return;
    setFilter(next);
    setLimit(PAGE_SIZE);
  };

  const loadMore = () => {
    setLimit((current) => current + PAGE_SIZE);
  };

  const summary = filter === "All" ? "All notes" : filter;

  return (
    <section aria-label="Journal articles">
      <div className="sticky top-16 z-30 border-b border-line bg-background/95">
        <div className="container-editorial">
          <div className="relative">
            <div
              ref={filterBarRef}
              role="group"
              aria-label="Filter articles by category"
              onKeyDown={onFilterKeyDown}
              className="flex items-center gap-5 overflow-x-auto py-1 pr-10 [scrollbar-width:none] sm:[@media(min-height:500px)]:flex-wrap sm:[@media(min-height:500px)]:gap-x-7 sm:[@media(min-height:500px)]:gap-y-0 sm:[@media(min-height:500px)]:overflow-visible sm:[@media(min-height:500px)]:pr-0 [&::-webkit-scrollbar]:hidden"
            >
              {FEED_FILTERS.map((option) => {
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
          data-journal-summary
          className="py-6 text-label uppercase tracking-label-wide text-muted"
        >
          {summary}, {String(shownCount).padStart(2, "0")} of{" "}
          {String(visible.length).padStart(2, "0")} shown
        </p>

        <MediaMasonry
          items={shown}
          label="Journal articles"
          revealKey={`${filter}:${limit}`}
          columnsClassName="columns-1 sm:columns-2 lg:columns-3"
          itemClassName="journal-item"
          getKey={(article) => article.slug}
          renderItem={(article) => <JournalCard article={article} />}
        />

        {shownCount < visible.length ? (
          <div className="mt-4 flex justify-center py-10">
            <Button variant="secondary" onClick={loadMore}>
              Load more articles
            </Button>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <div className="border-t border-line py-20 text-center">
            <p className="font-display text-display-sm">
              No articles in this category yet.
            </p>
            <p className="mt-2 text-body-sm text-secondary">
              New notes from the studio are published regularly.
            </p>
            <button
              type="button"
              onClick={() => selectFilter("All")}
              className="mt-6 min-h-11 text-button font-medium text-primary underline underline-offset-4"
            >
              Read all articles
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
