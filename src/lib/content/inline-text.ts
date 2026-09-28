/**
 * Inline highlight markup for CMS prose (studio request): the studio can
 * mark a word or phrase with `[kata](/tujuan)` inside a paragraph, and
 * the site renders it as a directional underline link. Only internal
 * paths and https destinations survive; anything else stays plain text,
 * so no stored text can smuggle script or unsafe URLs into a page.
 */
export interface InlineSegment {
  type: "text" | "link";
  text: string;
  href?: string;
}

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function isSafeHref(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

/** Splits prose into text and safe link segments. */
export function parseInlineText(value: string): InlineSegment[] {
  if (!value) return [];
  const segments: InlineSegment[] = [];
  let cursor = 0;

  for (const match of value.matchAll(LINK_PATTERN)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const label = (match[1] ?? "").trim();
    const href = match[2] ?? "";
    if (!label || !isSafeHref(href)) continue;

    if (index > cursor) {
      segments.push({ type: "text", text: value.slice(cursor, index) });
    }
    segments.push({ type: "link", text: label, href });
    cursor = index + raw.length;
  }

  if (cursor < value.length) {
    segments.push({ type: "text", text: value.slice(cursor) });
  }
  return segments;
}

/** True when the text contains at least one renderable highlight link. */
export function hasInlineLinks(value: string): boolean {
  return parseInlineText(value).some((segment) => segment.type === "link");
}
