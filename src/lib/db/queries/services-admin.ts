import { asc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  CONTENT_STATUSES,
  PRICE_TYPES,
  pricing,
  serviceDetails,
  serviceFaqRelations,
  serviceProjectRelations,
  services,
  type ServiceDetailBody,
} from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin CRUD for Services and Pricing (§14, §15). Transport-agnostic;
 * the admin routes own authentication and HTTP statuses. Pricing
 * follows the §6.6 rule: custom quotes keep the amount empty, fixed
 * and starting-from entries require a numeric amount.
 */

export type ContentStatusValue = (typeof CONTENT_STATUSES)[number];
export type PriceTypeValue = (typeof PRICE_TYPES)[number];

const PRICE_TYPE_LABEL: Record<PriceTypeValue, string> = {
  fixed: "Fixed",
  starting_from: "Starting From",
  custom_quote: "Custom Quote",
};

/** Documented initial service types (§6.4). */
export const SERVICE_TYPE_VALUES = [
  "Photography",
  "Film & Motion",
  "Commercial Campaign",
  "Portrait",
  "Product",
  "Event",
  "Creative Production",
] as const;

type ValidationResult<T> =
  | { ok: true; value: Partial<T> }
  | { ok: false; errors: string[] };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function optionalText(
  value: unknown,
  label: string,
  limit: number,
  errors: string[],
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    errors.push(`${label} must be a string or null.`);
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > limit) {
    errors.push(`${label} must be ${limit} characters or fewer.`);
    return undefined;
  }
  return trimmed.length > 0 ? trimmed : null;
}

function optionalMediaId(
  value: unknown,
  label: string,
  errors: string[],
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) <= 0) {
    errors.push(`${label} must be a positive asset id or null.`);
    return undefined;
  }
  return value as number;
}

function optionalSortOrder(
  value: unknown,
  errors: string[],
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    errors.push("sortOrder must be a non-negative integer.");
    return undefined;
  }
  return value as number;
}

function validateStringList(
  value: unknown,
  label: string,
  limit: number,
  errors: string[],
): string[] | undefined {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array of strings.`);
    return undefined;
  }
  if (value.length > 40) {
    errors.push(`${label} must hold 40 entries or fewer.`);
    return undefined;
  }
  const list: string[] = [];
  for (const [index, entry] of value.entries()) {
    if (!isNonEmptyString(entry)) {
      errors.push(`${label}[${index}] must be a non-empty string.`);
      return undefined;
    }
    if (entry.trim().length > limit) {
      errors.push(`${label}[${index}] must be ${limit} characters or fewer.`);
      return undefined;
    }
    list.push(entry.trim());
  }
  return list;
}

/* ---------------- Services ---------------- */

export interface ServiceDetailsInput {
  bodyBlocks: ServiceDetailBody;
  deliverables: string[];
}

export interface ServiceInput {
  name: string;
  slug: string;
  serviceType: string;
  shortDescription: string;
  supportingMediaId: number | null;
  seoMetaTitle: string | null;
  seoMetaDescription: string | null;
  seoOgMediaId: number | null;
  sortOrder: number;
  status: ContentStatusValue;
  details?: ServiceDetailsInput;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateDetailsShape(
  value: unknown,
  errors: string[],
): ServiceDetailsInput | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push("details must be an object with bodyBlocks and deliverables.");
    return undefined;
  }
  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.bodyBlocks !== "object" ||
    candidate.bodyBlocks === null ||
    Array.isArray(candidate.bodyBlocks)
  ) {
    errors.push("details.bodyBlocks must hold paragraphs and whoItIsFor.");
    return undefined;
  }
  const blocks = candidate.bodyBlocks as Record<string, unknown>;
  const paragraphs = validateStringList(
    blocks.paragraphs,
    "details.bodyBlocks.paragraphs",
    2000,
    errors,
  );
  const whoItIsFor = validateStringList(
    blocks.whoItIsFor,
    "details.bodyBlocks.whoItIsFor",
    300,
    errors,
  );
  const deliverables = validateStringList(
    candidate.deliverables,
    "details.deliverables",
    300,
    errors,
  );
  if (!paragraphs || !whoItIsFor || !deliverables) return undefined;
  return { bodyBlocks: { paragraphs, whoItIsFor }, deliverables };
}

export function validateServiceInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ValidationResult<ServiceInput> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<ServiceInput> = {};

  const requireOnCreate = (key: string) => {
    if (!partial && body[key] === undefined) errors.push(`${key} is required.`);
  };
  requireOnCreate("name");
  requireOnCreate("slug");
  requireOnCreate("serviceType");
  requireOnCreate("shortDescription");

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name))
      errors.push("name must be a non-empty string.");
    else if (body.name.trim().length > 160)
      errors.push("name must be 160 characters or fewer.");
    else value.name = body.name.trim();
  }
  if (body.slug !== undefined) {
    if (!isNonEmptyString(body.slug))
      errors.push("slug must be a non-empty string.");
    else if (
      body.slug.trim().length > 120 ||
      !SLUG_PATTERN.test(body.slug.trim())
    )
      errors.push("slug must be lowercase letters, numbers, and dashes.");
    else value.slug = body.slug.trim();
  }
  if (body.serviceType !== undefined) {
    if (!isNonEmptyString(body.serviceType))
      errors.push("serviceType must be a non-empty string.");
    else if (
      !SERVICE_TYPE_VALUES.includes(
        body.serviceType.trim() as (typeof SERVICE_TYPE_VALUES)[number],
      )
    )
      errors.push(`serviceType must be one of: ${SERVICE_TYPE_VALUES.join(", ")}.`);
    else value.serviceType = body.serviceType.trim();
  }
  if (body.shortDescription !== undefined) {
    if (!isNonEmptyString(body.shortDescription))
      errors.push("shortDescription must be a non-empty string.");
    else if (body.shortDescription.trim().length > 320)
      errors.push("shortDescription must be 320 characters or fewer.");
    else value.shortDescription = body.shortDescription.trim();
  }
  if (body.supportingMediaId !== undefined) {
    const mediaId = optionalMediaId(
      body.supportingMediaId,
      "supportingMediaId",
      errors,
    );
    if (mediaId !== undefined) value.supportingMediaId = mediaId;
  }
  if (body.seoMetaTitle !== undefined) {
    const title = optionalText(body.seoMetaTitle, "seoMetaTitle", 160, errors);
    if (title !== undefined) value.seoMetaTitle = title;
  }
  if (body.seoMetaDescription !== undefined) {
    const description = optionalText(
      body.seoMetaDescription,
      "seoMetaDescription",
      320,
      errors,
    );
    if (description !== undefined) value.seoMetaDescription = description;
  }
  if (body.seoOgMediaId !== undefined) {
    const mediaId = optionalMediaId(body.seoOgMediaId, "seoOgMediaId", errors);
    if (mediaId !== undefined) value.seoOgMediaId = mediaId;
  }
  if (body.sortOrder !== undefined) {
    const sortOrder = optionalSortOrder(body.sortOrder, errors);
    if (sortOrder !== undefined) value.sortOrder = sortOrder;
  }
  if (body.status !== undefined) {
    if (!CONTENT_STATUSES.includes(body.status as ContentStatusValue))
      errors.push(`status must be one of: ${CONTENT_STATUSES.join(", ")}.`);
    else value.status = body.status as ContentStatusValue;
  }
  if (body.details !== undefined) {
    const details = validateDetailsShape(body.details, errors);
    if (details) value.details = details;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function listAllServices(database: QueryDatabase = defaultDb) {
  return await database
    .select()
    .from(services)
    .orderBy(asc(services.sortOrder), asc(services.id))
    .all();
}

export async function getServiceById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(services)
    .where(eq(services.id, id))
    .limit(1)
    .get();
}

export async function findServiceBySlug(
  slug: string,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(services)
    .where(eq(services.slug, slug))
    .limit(1)
    .get();
}

export async function getServiceDetailsRow(
  serviceId: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(serviceDetails)
    .where(eq(serviceDetails.serviceId, serviceId))
    .limit(1)
    .get();
}

/** Service plus its 1:1 detail row (admin view). */
export async function getServiceWithDetails(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const service = await getServiceById(id, database);
  if (!service) return undefined;
  const details = await getServiceDetailsRow(id, database);
  return {
    ...service,
    details: details?.bodyBlocks ?? null,
    detailsDeliverables: details?.deliverables ?? [],
  };
}

async function upsertServiceDetails(
  serviceId: number,
  details: ServiceDetailsInput,
  database: QueryDatabase,
) {
  const existing = await getServiceDetailsRow(serviceId, database);
  if (!existing) {
    return await database
      .insert(serviceDetails)
      .values({
        serviceId,
        bodyBlocks: details.bodyBlocks,
        deliverables: details.deliverables,
      })
      .returning()
      .get();
  }
  return await database
    .update(serviceDetails)
    .set({
      bodyBlocks: details.bodyBlocks,
      deliverables: details.deliverables,
      updatedAt: new Date(),
    })
    .where(eq(serviceDetails.serviceId, serviceId))
    .returning()
    .get();
}

export async function createService(
  input: ServiceInput,
  database: QueryDatabase = defaultDb,
) {
  const created = await database
    .insert(services)
    .values({
      name: input.name,
      slug: input.slug,
      serviceType: input.serviceType,
      shortDescription: input.shortDescription,
      supportingMediaId: input.supportingMediaId,
      seoMetaTitle: input.seoMetaTitle,
      seoMetaDescription: input.seoMetaDescription,
      seoOgMediaId: input.seoOgMediaId,
      sortOrder: input.sortOrder,
      status: input.status,
    })
    .returning()
    .get();

  if (input.details) {
    await upsertServiceDetails(created.id, input.details, database);
  }
  return created;
}

export async function updateService(
  id: number,
  patch: Partial<ServiceInput>,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.slug !== undefined) values.slug = patch.slug;
  if (patch.serviceType !== undefined) values.serviceType = patch.serviceType;
  if (patch.shortDescription !== undefined)
    values.shortDescription = patch.shortDescription;
  if (patch.supportingMediaId !== undefined)
    values.supportingMediaId = patch.supportingMediaId;
  if (patch.seoMetaTitle !== undefined) values.seoMetaTitle = patch.seoMetaTitle;
  if (patch.seoMetaDescription !== undefined)
    values.seoMetaDescription = patch.seoMetaDescription;
  if (patch.seoOgMediaId !== undefined) values.seoOgMediaId = patch.seoOgMediaId;
  if (patch.sortOrder !== undefined) values.sortOrder = patch.sortOrder;
  if (patch.status !== undefined) values.status = patch.status;

  const updated = await database
    .update(services)
    .set(values)
    .where(eq(services.id, id))
    .returning()
    .get();

  if (updated && patch.details) {
    await upsertServiceDetails(id, patch.details, database);
  }
  return updated;
}

export async function deleteService(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const deleted = await database
    .delete(services)
    .where(eq(services.id, id))
    .returning({ id: services.id })
    .get();
  return Boolean(deleted);
}

/* ---------------- Pricing ---------------- */

export interface PricingEntryInput {
  serviceId: number;
  packageName: string;
  priceType: PriceTypeValue;
  amount: number | null;
  currency: string | null;
  duration: string | null;
  deliverables: string[];
  notes: string | null;
  sortOrder: number;
  status: ContentStatusValue;
}

interface PricingExistingState {
  priceType: PriceTypeValue;
  amount: number | null;
}

/**
 * Validates a pricing payload for create or update. On update the
 * effective type/amount pair (patch over existing) must satisfy the
 * §6.6 rule, so the caller passes the existing row along.
 */
export function validatePricingInput(
  raw: unknown,
  { partial, existing }: { partial: boolean; existing?: PricingExistingState },
): ValidationResult<PricingEntryInput> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<PricingEntryInput> = {};

  const requireOnCreate = (key: string) => {
    if (!partial && body[key] === undefined) errors.push(`${key} is required.`);
  };
  requireOnCreate("serviceId");
  requireOnCreate("packageName");
  requireOnCreate("priceType");

  if (body.serviceId !== undefined) {
    if (!Number.isInteger(body.serviceId) || (body.serviceId as number) <= 0)
      errors.push("serviceId must be a positive integer.");
    else value.serviceId = body.serviceId as number;
  }
  if (body.packageName !== undefined) {
    if (!isNonEmptyString(body.packageName))
      errors.push("packageName must be a non-empty string.");
    else if (body.packageName.trim().length > 160)
      errors.push("packageName must be 160 characters or fewer.");
    else value.packageName = body.packageName.trim();
  }
  if (body.priceType !== undefined) {
    if (!PRICE_TYPES.includes(body.priceType as PriceTypeValue))
      errors.push(`priceType must be one of: ${PRICE_TYPES.join(", ")}.`);
    else value.priceType = body.priceType as PriceTypeValue;
  }
  if (body.amount !== undefined) {
    if (body.amount === null) value.amount = null;
    else if (
      !Number.isInteger(body.amount) ||
      (body.amount as number) < 0
    )
      errors.push("amount must be a whole number of 0 or more, or null.");
    else value.amount = body.amount as number;
  }
  if (body.currency !== undefined) {
    const currency = optionalText(body.currency, "currency", 10, errors);
    if (currency !== undefined) value.currency = currency;
  }
  if (body.duration !== undefined) {
    const duration = optionalText(body.duration, "duration", 160, errors);
    if (duration !== undefined) value.duration = duration;
  }
  if (body.deliverables !== undefined) {
    const deliverables = validateStringList(
      body.deliverables,
      "deliverables",
      300,
      errors,
    );
    if (deliverables) value.deliverables = deliverables;
  }
  if (body.notes !== undefined) {
    const notes = optionalText(body.notes, "notes", 1000, errors);
    if (notes !== undefined) value.notes = notes;
  }
  if (body.sortOrder !== undefined) {
    const sortOrder = optionalSortOrder(body.sortOrder, errors);
    if (sortOrder !== undefined) value.sortOrder = sortOrder;
  }
  if (body.status !== undefined) {
    if (!CONTENT_STATUSES.includes(body.status as ContentStatusValue))
      errors.push(`status must be one of: ${CONTENT_STATUSES.join(", ")}.`);
    else value.status = body.status as ContentStatusValue;
  }

  if (errors.length === 0) {
    const effectiveType = (value.priceType ?? existing?.priceType) as
      | PriceTypeValue
      | undefined;
    const effectiveAmount =
      value.amount !== undefined ? value.amount : existing?.amount ?? null;
    if (effectiveType) {
      if (effectiveType === "custom_quote" && effectiveAmount !== null) {
        errors.push("Custom Quote entries must not carry an amount.");
      }
      if (effectiveType !== "custom_quote" && effectiveAmount === null) {
        errors.push(
          `${PRICE_TYPE_LABEL[effectiveType]} entries require an amount.`,
        );
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function listAllPricing(database: QueryDatabase = defaultDb) {
  return await database
    .select()
    .from(pricing)
    .orderBy(asc(pricing.sortOrder), asc(pricing.id))
    .all();
}

export async function getPricingById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(pricing)
    .where(eq(pricing.id, id))
    .limit(1)
    .get();
}

export async function createPricing(
  input: PricingEntryInput,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .insert(pricing)
    .values({
      serviceId: input.serviceId,
      packageName: input.packageName,
      priceType: input.priceType,
      amount: input.amount,
      currency: input.currency,
      duration: input.duration,
      deliverables: input.deliverables ?? [],
      notes: input.notes,
      sortOrder: input.sortOrder,
      status: input.status,
    })
    .returning()
    .get();
}

export async function updatePricing(
  id: number,
  patch: Partial<PricingEntryInput>,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.serviceId !== undefined) values.serviceId = patch.serviceId;
  if (patch.packageName !== undefined) values.packageName = patch.packageName;
  if (patch.priceType !== undefined) values.priceType = patch.priceType;
  if (patch.amount !== undefined) values.amount = patch.amount;
  if (patch.currency !== undefined) values.currency = patch.currency;
  if (patch.duration !== undefined) values.duration = patch.duration;
  if (patch.deliverables !== undefined) values.deliverables = patch.deliverables;
  if (patch.notes !== undefined) values.notes = patch.notes;
  if (patch.sortOrder !== undefined) values.sortOrder = patch.sortOrder;
  if (patch.status !== undefined) values.status = patch.status;

  return await database
    .update(pricing)
    .set(values)
    .where(eq(pricing.id, id))
    .returning()
    .get();
}

export async function deletePricing(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const deleted = await database
    .delete(pricing)
    .where(eq(pricing.id, id))
    .returning({ id: pricing.id })
    .get();
  return Boolean(deleted);
}

/* ---------------- Service detail relations (§6.5) ---------------- */

export interface ServiceRelationsInput {
  projects?: string[];
  faqIds?: number[];
}

const RELATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateServiceRelationsInput(
  raw: unknown,
): ValidationResult<ServiceRelationsInput> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: ServiceRelationsInput = {};

  if (body.projects === undefined && body.faqIds === undefined) {
    errors.push("Provide projects, faqIds, or both.");
  }

  if (body.projects !== undefined) {
    if (!Array.isArray(body.projects)) {
      errors.push("projects must be an array of project slugs.");
    } else if (body.projects.length > 24) {
      errors.push("projects must hold 24 slugs or fewer.");
    } else {
      const slugs: string[] = [];
      for (const [index, entry] of body.projects.entries()) {
        if (
          typeof entry !== "string" ||
          entry.trim().length === 0 ||
          !RELATION_SLUG_PATTERN.test(entry.trim())
        ) {
          errors.push(
            `projects[${index}] must be a lowercase slug like dean-and-deb.`,
          );
          break;
        }
        if (slugs.includes(entry.trim())) {
          errors.push(`projects[${index}] is a duplicate slug.`);
          break;
        }
        slugs.push(entry.trim());
      }
      if (slugs.length === body.projects.length)
        value.projects = slugs;
    }
  }

  if (body.faqIds !== undefined) {
    if (!Array.isArray(body.faqIds)) {
      errors.push("faqIds must be an array of FAQ ids.");
    } else if (body.faqIds.length > 50) {
      errors.push("faqIds must hold 50 ids or fewer.");
    } else {
      const ids: number[] = [];
      for (const [index, entry] of body.faqIds.entries()) {
        if (!Number.isInteger(entry) || (entry as number) <= 0) {
          errors.push(`faqIds[${index}] must be a positive FAQ id.`);
          break;
        }
        if (ids.includes(entry as number)) {
          errors.push(`faqIds[${index}] is a duplicate id.`);
          break;
        }
        ids.push(entry as number);
      }
      if (ids.length === body.faqIds.length) value.faqIds = ids;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function listServiceProjectRelations(
  serviceId: number,
  database: QueryDatabase = defaultDb,
): Promise<string[]> {
  const rows = await database
    .select({ projectSlug: serviceProjectRelations.projectSlug })
    .from(serviceProjectRelations)
    .where(eq(serviceProjectRelations.serviceId, serviceId))
    .orderBy(
      asc(serviceProjectRelations.sortOrder),
      asc(serviceProjectRelations.id),
    )
    .all();
  return rows.map((row) => row.projectSlug);
}

/** Replaces the whole selected-work list for a service. */
export async function replaceServiceProjectRelations(
  serviceId: number,
  slugs: string[],
  database: QueryDatabase = defaultDb,
): Promise<string[]> {
  await database
    .delete(serviceProjectRelations)
    .where(eq(serviceProjectRelations.serviceId, serviceId))
    .run();
  if (slugs.length > 0) {
    await database
      .insert(serviceProjectRelations)
      .values(
        slugs.map((slug, index) => ({
          serviceId,
          projectSlug: slug,
          sortOrder: index,
        })),
      )
      .run();
  }
  return listServiceProjectRelations(serviceId, database);
}

export async function listServiceFaqRelations(
  serviceId: number,
  database: QueryDatabase = defaultDb,
): Promise<number[]> {
  const rows = await database
    .select({ faqId: serviceFaqRelations.faqId })
    .from(serviceFaqRelations)
    .where(eq(serviceFaqRelations.serviceId, serviceId))
    .orderBy(asc(serviceFaqRelations.sortOrder), asc(serviceFaqRelations.id))
    .all();
  return rows.map((row) => row.faqId);
}

/** Replaces the whole related-FAQ list for a service. */
export async function replaceServiceFaqRelations(
  serviceId: number,
  faqIds: number[],
  database: QueryDatabase = defaultDb,
): Promise<number[]> {
  await database
    .delete(serviceFaqRelations)
    .where(eq(serviceFaqRelations.serviceId, serviceId))
    .run();
  if (faqIds.length > 0) {
    await database
      .insert(serviceFaqRelations)
      .values(
        faqIds.map((faqId, index) => ({
          serviceId,
          faqId,
          sortOrder: index,
        })),
      )
      .run();
  }
  return listServiceFaqRelations(serviceId, database);
}
