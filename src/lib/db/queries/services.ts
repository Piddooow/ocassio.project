import { and, asc, eq, inArray } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  faq,
  mediaAssets,
  mediaVariants,
  pricing,
  serviceDetails,
  serviceFaqRelations,
  serviceProjectRelations,
  services,
  type ServiceDetailBody,
} from "@/lib/db/schema";
import { publicFaqConditions as faqConditions } from "./faq";
import type { PublicFaqEntry } from "./faq";
import type { QueryDatabase } from "./upcoming";

/**
 * Public Services and Pricing queries (§6.4-§6.6). Reads published
 * services only, and never exposes a draft service through its
 * pricing entries (PRD §13, §24).
 */

export interface ServiceImage {
  alt: string | null;
  variants: { width: number; url: string }[];
}

/**
 * Single enforcement points for public Services reads (§6.4-§6.6):
 * published services only; pricing additionally requires its parent
 * service to be published. Every public query filters through these.
 */
export function publicServiceConditions() {
  return eq(services.status, "published");
}

export function publicPricingConditions() {
  return and(
    eq(pricing.status, "published"),
    eq(services.status, "published"),
  );
}

function variantsByAssetId(database: QueryDatabase, assetIds: number[]) {
  const variantRows = assetIds.length
    ? database
        .select({
          assetId: mediaVariants.assetId,
          width: mediaVariants.width,
          url: mediaVariants.url,
        })
        .from(mediaVariants)
        .where(inArray(mediaVariants.assetId, assetIds))
        .all()
    : [];

  const map = new Map<number, { width: number; url: string }[]>();
  for (const variant of variantRows) {
    const list = map.get(variant.assetId) ?? [];
    list.push({ width: variant.width, url: variant.url });
    map.set(variant.assetId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.width - b.width);
  }
  return map;
}

function imageFor(
  map: Map<number, { width: number; url: string }[]>,
  assetId: number | null,
  altText: string | null,
): ServiceImage | null {
  if (assetId === null) return null;
  return { alt: altText, variants: map.get(assetId) ?? [] };
}

export interface PublicServiceSummary {
  id: number;
  name: string;
  slug: string;
  serviceType: string;
  shortDescription: string;
  sortOrder: number;
  cover: ServiceImage | null;
}

/** Published services in display order, covers resolved (§6.4). */
export async function listPublishedServices(
  database: QueryDatabase = defaultDb,
): Promise<PublicServiceSummary[]> {
  const rows = database
    .select({
      id: services.id,
      name: services.name,
      slug: services.slug,
      serviceType: services.serviceType,
      shortDescription: services.shortDescription,
      sortOrder: services.sortOrder,
      assetId: mediaAssets.id,
      altText: mediaAssets.altText,
    })
    .from(services)
    .leftJoin(mediaAssets, eq(services.supportingMediaId, mediaAssets.id))
    .where(publicServiceConditions())
    .orderBy(asc(services.sortOrder), asc(services.id))
    .all();

  const variants = variantsByAssetId(
    database,
    rows
      .map((row) => row.assetId)
      .filter((id): id is number => id !== null),
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    serviceType: row.serviceType,
    shortDescription: row.shortDescription,
    sortOrder: row.sortOrder,
    cover: imageFor(variants, row.assetId, row.altText),
  }));
}

export interface PublicServicePricingEntry {
  id: number;
  packageName: string;
  priceType: (typeof pricing.$inferSelect)["priceType"];
  amount: number | null;
  currency: string | null;
  duration: string | null;
  deliverables: string[];
  notes: string | null;
  sortOrder: number;
}

export interface PublicServiceDetail extends PublicServiceSummary {
  details: ServiceDetailBody | null;
  deliverables: string[];
  pricing: PublicServicePricingEntry[];
  relatedProjects: string[];
  faq: PublicFaqEntry[];
}

/** A single published service with its details and published pricing. */
export async function getPublishedServiceBySlug(
  slug: string,
  database: QueryDatabase = defaultDb,
): Promise<PublicServiceDetail | null> {
  const summaries = await listPublishedServices(database);
  const summary = summaries.find((service) => service.slug === slug);
  if (!summary) return null;

  const detailRow = database
    .select()
    .from(serviceDetails)
    .where(eq(serviceDetails.serviceId, summary.id))
    .limit(1)
    .all()[0];

  const pricingRows = database
    .select({
      id: pricing.id,
      packageName: pricing.packageName,
      priceType: pricing.priceType,
      amount: pricing.amount,
      currency: pricing.currency,
      duration: pricing.duration,
      deliverables: pricing.deliverables,
      notes: pricing.notes,
      sortOrder: pricing.sortOrder,
    })
    .from(pricing)
    .where(
      and(eq(pricing.serviceId, summary.id), eq(pricing.status, "published")),
    )
    .orderBy(asc(pricing.sortOrder), asc(pricing.id))
    .all();

  const projectRows = database
    .select({ projectSlug: serviceProjectRelations.projectSlug })
    .from(serviceProjectRelations)
    .where(eq(serviceProjectRelations.serviceId, summary.id))
    .orderBy(
      asc(serviceProjectRelations.sortOrder),
      asc(serviceProjectRelations.id),
    )
    .all();

  const faqRows = database
    .select({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      sortOrder: serviceFaqRelations.sortOrder,
    })
    .from(serviceFaqRelations)
    .innerJoin(faq, eq(serviceFaqRelations.faqId, faq.id))
    .where(
      and(
        eq(serviceFaqRelations.serviceId, summary.id),
        faqConditions(),
      ),
    )
    .orderBy(
      asc(serviceFaqRelations.sortOrder),
      asc(faq.sortOrder),
      asc(faq.id),
    )
    .all();

  return {
    ...summary,
    details: detailRow?.bodyBlocks ?? null,
    deliverables: detailRow?.deliverables ?? [],
    pricing: pricingRows,
    relatedProjects: projectRows.map((row) => row.projectSlug),
    faq: faqRows,
  };
}

export interface PublicPricingEntry extends PublicServicePricingEntry {
  serviceId: number;
  serviceSlug: string;
  serviceName: string;
}

/**
 * Published pricing entries of published services, in display order.
 * Optionally narrowed to one service by slug (§6.6).
 */
export async function listPublishedPricing(
  options: { serviceSlug?: string } = {},
  database: QueryDatabase = defaultDb,
): Promise<PublicPricingEntry[]> {
  const conditions = [publicPricingConditions()];
  if (options.serviceSlug) conditions.push(eq(services.slug, options.serviceSlug));

  return database
    .select({
      id: pricing.id,
      serviceId: services.id,
      serviceSlug: services.slug,
      serviceName: services.name,
      packageName: pricing.packageName,
      priceType: pricing.priceType,
      amount: pricing.amount,
      currency: pricing.currency,
      duration: pricing.duration,
      deliverables: pricing.deliverables,
      notes: pricing.notes,
      sortOrder: pricing.sortOrder,
    })
    .from(pricing)
    .innerJoin(services, eq(pricing.serviceId, services.id))
    .where(and(...conditions))
    .orderBy(asc(pricing.sortOrder), asc(pricing.id))
    .all();
}
