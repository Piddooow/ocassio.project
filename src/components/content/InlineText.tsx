import { Fragment } from "react";
import { DirectionalLink } from "@/components/ui/directional-link";
import { parseInlineText } from "@/lib/content/inline-text";

/**
 * Renders CMS prose with inline highlight links (`[kata](/tujuan)`).
 * Paragraphs without markup render as the plain string they were.
 */
export function InlineText({
  value,
  rest = true,
}: {
  value: string;
  /** Keeps a hairline under links at rest, for prose. */
  rest?: boolean;
}) {
  const segments = parseInlineText(value);
  if (segments.every((segment) => segment.type === "text")) return <>{value}</>;

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === "link" ? (
          <DirectionalLink
            key={index}
            href={segment.href}
            rest={rest}
            data-inline-link
          >
            {segment.text}
          </DirectionalLink>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}
