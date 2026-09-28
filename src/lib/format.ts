/**
 * Deterministic date formatting for content dates.
 * UTC is pinned so server prerender and any future client render agree.
 */
const ARTICLE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatArticleDate(isoDate: string): string {
  return ARTICLE_DATE_FORMAT.format(new Date(isoDate));
}
