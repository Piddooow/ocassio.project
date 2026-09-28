"use client";

import type { PublicNowEntry } from "@/lib/db/queries/upcoming";
import { InfiniteSpiral, type SpiralItem } from "@/components/ui/infinite-spiral";

interface NowSpiralProps {
  entries: PublicNowEntry[];
}

/** Picks a mid-size variant so spiral cards stay light. */
function spiralVariant(entry: PublicNowEntry): string | null {
  const variants = entry.image?.variants ?? [];
  if (variants.length === 0) return null;
  const sorted = [...variants].sort((a, b) => a.width - b.width);
  const mid = sorted.find((variant) => variant.width >= 640);
  return (mid ?? sorted[sorted.length - 1]).url;
}

/**
 * Currently-in-production spiral (studio request): entry stills drift
 * through a helix. Renders only when at least three entries carry real
 * images, so the honest empty state stays untouched.
 */
export function NowSpiral({ entries }: NowSpiralProps) {
  const items: SpiralItem[] = [];
  for (const entry of entries) {
    const src = spiralVariant(entry);
    if (!src) continue;
    items.push({
      id: `now-${entry.id}`,
      src,
      alt: entry.image?.alt ?? `${entry.title}, in production`,
      label: entry.title,
    });
  }
  if (items.length < 3) return null;

  return (
    <InfiniteSpiral
      items={items}
      animationMode="auto"
      speed={0.4}
      radius={300}
      cardWidth={132}
      cardHeight={132}
      verticalSpacing={86}
      perspective={1000}
      cardRadius={12}
      centerScale={1.1}
      edgeFade={0.3}
      edgeBlur={0}
      cardsPerTurn={6}
      pauseOnHover
    />
  );
}
