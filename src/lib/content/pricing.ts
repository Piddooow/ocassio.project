import type { ContentStatus } from "./types";

export type PriceType = "fixed" | "starting_from" | "custom_quote";

export interface PricingEntry {
  id: string;
  serviceSlug: string;
  packageName: string;
  priceType: PriceType;
  /**
   * Currency amount. Stays null until the studio publishes real numbers
   * (R-17: no invented figures). Pages show "Quote on request".
   */
  amount: string | null;
  duration: string | null;
  deliverables: string[];
  notes: string | null;
  sortOrder: number;
  status: ContentStatus;
}

/**
 * Pricing entries. The three documented price types (Fixed, Starting From,
 * Custom Quote) live in the data model; public numbers arrive from the
 * studio later, so every entry currently quotes on request.
 */
export const PRICING: PricingEntry[] = [
  {
    id: "photography-commission",
    serviceSlug: "photography",
    packageName: "Photography Commission",
    priceType: "custom_quote",
    amount: null,
    duration: null,
    deliverables: [
      "Pre-production planning",
      "Shoot day coverage",
      "Studio-edited final set",
    ],
    notes: "Quoted per scope, location, and coverage length.",
    sortOrder: 1,
    status: "published",
  },
  {
    id: "portrait-session",
    serviceSlug: "portrait",
    packageName: "Portrait Session",
    priceType: "custom_quote",
    amount: null,
    duration: "90 minutes",
    deliverables: [
      "Guided session with direction",
      "Studio-edited selects",
      "High-resolution files",
    ],
    notes: "Quoted per session and final image count.",
    sortOrder: 2,
    status: "published",
  },
  {
    id: "film-commission",
    serviceSlug: "film-and-motion",
    packageName: "Film Commission",
    priceType: "custom_quote",
    amount: null,
    duration: null,
    deliverables: [
      "Concept and treatment",
      "Shoot days with crew",
      "Edit, grade, and delivery",
    ],
    notes: "Quoted per scope, crew, and final cut lengths.",
    sortOrder: 3,
    status: "published",
  },
  {
    id: "event-coverage",
    serviceSlug: "event",
    packageName: "Event Coverage",
    priceType: "custom_quote",
    amount: null,
    duration: "Half day or full day",
    deliverables: [
      "Coverage plan",
      "On-site shoot team",
      "Edited delivery after the event",
    ],
    notes: "Quoted per event size and coverage duration.",
    sortOrder: 4,
    status: "published",
  },
];

export function getPricingForService(serviceSlug: string): PricingEntry[] {
  return PRICING.filter(
    (entry) => entry.serviceSlug === serviceSlug && entry.status === "published",
  ).sort((a, b) => a.sortOrder - b.sortOrder);
}

export const PRICE_TYPE_LABEL: Record<PriceType, string> = {
  fixed: "Fixed",
  starting_from: "Starting From",
  custom_quote: "Custom Quote",
};

/** What shapes a custom quote (§6.6, documented factors). */
export const PRICING_FACTORS = [
  "Scope",
  "Crew",
  "Location",
  "Usage Rights",
  "Production",
  "Duration",
  "Deliverables",
] as const;

/**
 * Price type rules (§6.6, corrected data rule from the PRD):
 * - Fixed and Starting From require a numeric amount.
 * - Custom Quote must leave the amount empty.
 * Returns a list of specific issues; empty means the entry is valid.
 */
export function validatePricingEntry(entry: PricingEntry): string[] {
  const issues: string[] = [];
  if (entry.packageName.trim().length === 0) {
    issues.push("Package name is required.");
  }
  if (entry.sortOrder < 0) {
    issues.push("Display order must be zero or more.");
  }
  if (entry.priceType === "custom_quote") {
    if (entry.amount !== null) {
      issues.push("Custom Quote entries must not carry a numeric amount.");
    }
  } else if (!entry.amount || entry.amount.trim().length === 0) {
    issues.push(
      `${PRICE_TYPE_LABEL[entry.priceType]} entries require an amount.`,
    );
  }
  return issues;
}
