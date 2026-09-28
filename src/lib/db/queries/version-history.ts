import { and, desc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  VERSIONED_ENTITIES,
  versionHistory,
  type VersionRecord,
} from "@/lib/db/schema";
import {
  getPricingById,
  getServiceById,
  getServiceDetailsRow,
  updatePricing,
  updateService,
} from "./services-admin";
import { getStudioAboutRow, upsertStudioAbout } from "./studio-admin";
import {
  getArticleDetail,
  getArticleRowById,
  updateArticle,
  type ArticleBlockInput,
} from "./articles-admin";
import {
  getProjectAdminDetail,
  getProjectRowById,
  updateProject,
  type ProjectUpdateInput,
} from "./projects-admin";
import type { QueryDatabase } from "./upcoming";

/**
 * Version history (§25): every content save appends a snapshot.
 * Actions: View (list + single version), Compare (two snapshots of the
 * same entity), Restore (writes the old content back and appends a new
 * version, so the log stays append-only).
 *
 * Restore applies content fields only; identity and publishing state
 * (slug, status, relations) are preserved.
 */

export type VersionedEntity = (typeof VERSIONED_ENTITIES)[number];

export interface VersionMeta {
  id: number;
  entityType: string;
  entityId: number;
  versionNo: number;
  createdBy: number | null;
  createdAt: Date;
}

export const VERSION_META_COLUMNS = {
  id: versionHistory.id,
  entityType: versionHistory.entityType,
  entityId: versionHistory.entityId,
  versionNo: versionHistory.versionNo,
  createdBy: versionHistory.createdBy,
  createdAt: versionHistory.createdAt,
};

export function isVersionedEntity(value: unknown): value is VersionedEntity {
  return (
    typeof value === "string" &&
    VERSIONED_ENTITIES.includes(value as VersionedEntity)
  );
}

/** Snapshot the current state of a versioned entity, or null if gone. */
export async function buildVersionSnapshot(
  entityType: VersionedEntity,
  entityId: number,
  database: QueryDatabase = defaultDb,
): Promise<unknown | null> {
  if (entityType === "service") {
    const service = await getServiceById(entityId, database);
    if (!service) return null;
    const details = (await getServiceDetailsRow(entityId, database)) ?? null;
    return { service, details };
  }
  if (entityType === "pricing") {
    return (await getPricingById(entityId, database)) ?? null;
  }
  if (entityType === "studio_about") {
    return (await getStudioAboutRow(database)) ?? null;
  }
  if (entityType === "article") {
    return (await getArticleDetail(entityId, database)) ?? null;
  }
  if (entityType === "project") {
    return (await getProjectAdminDetail(entityId, database)) ?? null;
  }
  return null;
}

/** Appends the next version for an entity. */
export async function recordVersion(
  entityType: VersionedEntity,
  entityId: number,
  snapshot: unknown,
  database: QueryDatabase = defaultDb,
): Promise<VersionRecord> {
  const latest = await database
    .select({ versionNo: versionHistory.versionNo })
    .from(versionHistory)
    .where(
      and(
        eq(versionHistory.entityType, entityType),
        eq(versionHistory.entityId, entityId),
      ),
    )
    .orderBy(desc(versionHistory.versionNo))
    .limit(1)
    .get();

  return await database
    .insert(versionHistory)
    .values({
      entityType,
      entityId,
      versionNo: (latest?.versionNo ?? 0) + 1,
      snapshot,
    })
    .returning()
    .get();
}

/** Newest first version list for one entity. */
export async function listVersions(
  entityType: VersionedEntity,
  entityId: number,
  database: QueryDatabase = defaultDb,
): Promise<VersionMeta[]> {
  return await database
    .select(VERSION_META_COLUMNS)
    .from(versionHistory)
    .where(
      and(
        eq(versionHistory.entityType, entityType),
        eq(versionHistory.entityId, entityId),
      ),
    )
    .orderBy(desc(versionHistory.versionNo))
    .all();
}

export async function getVersionById(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<VersionRecord | undefined> {
  return await database
    .select()
    .from(versionHistory)
    .where(eq(versionHistory.id, id))
    .limit(1)
    .get();
}

export type RestoreResult =
  | {
      ok: true;
      entityType: VersionedEntity;
      entityId: number;
      recorded: VersionRecord;
    }
  | { ok: false; status: 404 | 422; issues: string[] };

interface ServiceSnapshot {
  service?: Record<string, unknown>;
  details?: Record<string, unknown> | null;
}

/** Restores a snapshot's content fields, then records the new state. */
export async function restoreVersion(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<RestoreResult> {
  const version = await getVersionById(id, database);
  if (!version) {
    return { ok: false, status: 404, issues: [`Version not found: ${id}.`] };
  }
  if (!isVersionedEntity(version.entityType)) {
    return {
      ok: false,
      status: 422,
      issues: [`Restore is not supported for ${version.entityType}.`],
    };
  }

  const entityType = version.entityType;
  const entityId = version.entityId;

  if (entityType === "service") {
    const snapshot = version.snapshot as ServiceSnapshot | null;
    const source = snapshot?.service;
    if (!source) {
      return {
        ok: false,
        status: 422,
        issues: ["The snapshot does not carry a service."],
      };
    }
    const existing = await getServiceById(entityId, database);
    if (!existing) {
      return {
        ok: false,
        status: 404,
        issues: [`Service not found: ${entityId}.`],
      };
    }
    const details = snapshot?.details
      ? {
          bodyBlocks: snapshot.details.bodyBlocks as {
            paragraphs: string[];
            whoItIsFor: string[];
          },
          deliverables: (snapshot.details.deliverables as string[]) ?? [],
        }
      : undefined;
    await updateService(
      entityId,
      {
        name: source.name as string,
        serviceType: source.serviceType as string,
        shortDescription: source.shortDescription as string,
        supportingMediaId: (source.supportingMediaId as number | null) ?? null,
        seoMetaTitle: (source.seoMetaTitle as string | null) ?? null,
        seoMetaDescription: (source.seoMetaDescription as string | null) ?? null,
        seoOgMediaId: (source.seoOgMediaId as number | null) ?? null,
        sortOrder: (source.sortOrder as number) ?? 0,
        details,
      },
      database,
    );
  } else if (entityType === "pricing") {
    const source = version.snapshot as Record<string, unknown> | null;
    if (!source) {
      return {
        ok: false,
        status: 422,
        issues: ["The snapshot does not carry a pricing entry."],
      };
    }
    const existing = await getPricingById(entityId, database);
    if (!existing) {
      return {
        ok: false,
        status: 404,
        issues: [`Pricing entry not found: ${entityId}.`],
      };
    }
    await updatePricing(
      entityId,
      {
        packageName: source.packageName as string,
        priceType: source.priceType as "fixed" | "starting_from" | "custom_quote",
        amount: (source.amount as number | null) ?? null,
        currency: (source.currency as string | null) ?? null,
        duration: (source.duration as string | null) ?? null,
        deliverables: (source.deliverables as string[]) ?? [],
        notes: (source.notes as string | null) ?? null,
        sortOrder: (source.sortOrder as number) ?? 0,
      },
      database,
    );
  } else if (entityType === "article") {
    const snapshot = version.snapshot as {
      article?: Record<string, unknown>;
      category?: { slug?: string } | null;
      blocks?: Array<Record<string, unknown>>;
    } | null;
    const source = snapshot?.article;
    if (!source || typeof source.title !== "string") {
      return {
        ok: false,
        status: 422,
        issues: ["The snapshot does not carry an article."],
      };
    }
    const existing = await getArticleRowById(entityId, database);
    if (!existing) {
      return {
        ok: false,
        status: 404,
        issues: [`Article not found: ${entityId}.`],
      };
    }
    const categorySlug = snapshot?.category?.slug;
    const blocks: ArticleBlockInput[] = (snapshot?.blocks ?? []).map(
      (block) => ({
        type: block.blockType as ArticleBlockInput["type"],
        text: (block.textContent as string | null) ?? null,
        mediaId: (block.mediaId as number | null) ?? null,
        referenceProjectId:
          (block.referenceProjectId as number | null) ?? null,
      }),
    );
    const restored = await updateArticle(
      entityId,
      {
        title: source.title,
        excerpt: (source.excerpt as string) ?? existing.excerpt,
        publishDate: (source.publishDate as string) ?? existing.publishDate,
        ...(categorySlug ? { categorySlug } : {}),
        author: (source.author as string | null) ?? null,
        relatedProjectId: (source.relatedProjectId as number | null) ?? null,
        coverMediaId: (source.coverMediaId as number | null) ?? null,
        seoMetaTitle: (source.seoMetaTitle as string | null) ?? null,
        seoMetaDescription: (source.seoMetaDescription as string | null) ?? null,
        seoOgMediaId: (source.seoOgMediaId as number | null) ?? null,
        blocks,
      },
      database,
    );
    if (!restored.ok) {
      return {
        ok: false,
        status: restored.status === 404 ? 404 : 422,
        issues: restored.issues,
      };
    }
  } else if (entityType === "project") {
    const snapshot = version.snapshot as {
      project?: Record<string, unknown>;
      media?: Array<Record<string, unknown>>;
    } | null;
    const source = snapshot?.project;
    if (!source || typeof source.title !== "string") {
      return {
        ok: false,
        status: 422,
        issues: ["The snapshot does not carry a project."],
      };
    }
    const existing = await getProjectRowById(entityId, database);
    if (!existing) {
      return {
        ok: false,
        status: 404,
        issues: [`Project not found: ${entityId}.`],
      };
    }
    const patch: Record<string, unknown> = {
      title: source.title,
      client: (source.client as string | null) ?? null,
      projectType: (source.projectType as string) ?? existing.projectType,
      category: source.category,
      year: source.year,
      projectDate: (source.projectDate as string) ?? existing.projectDate,
      location: (source.location as string | null) ?? null,
      shortDescription:
        (source.shortDescription as string) ?? existing.shortDescription,
      coverMediaId: (source.coverMediaId as number | null) ?? null,
      heroMediaId: (source.heroMediaId as number | null) ?? null,
      seoMetaTitle: (source.seoMetaTitle as string | null) ?? null,
      seoMetaDescription: (source.seoMetaDescription as string | null) ?? null,
      seoOgMediaId: (source.seoOgMediaId as number | null) ?? null,
      credits: (source.credits as unknown[]) ?? [],
      relatedSlugs: (source.relatedSlugs as string[]) ?? [],
      mediaIds: (snapshot?.media ?? []).map(
        (entry) => entry.mediaId as number,
      ),
    };
    const restored = await updateProject(
      entityId,
      patch as ProjectUpdateInput,
      database,
    );
    if (!restored.ok) {
      return {
        ok: false,
        status: restored.status === 404 ? 404 : 422,
        issues: restored.issues,
      };
    }
  } else {
    const source = version.snapshot as Record<string, unknown> | null;
    if (!source || typeof source.heading !== "string") {
      return {
        ok: false,
        status: 422,
        issues: ["The snapshot does not carry About content."],
      };
    }
    await upsertStudioAbout(
      {
        heading: source.heading,
        body: source.body as { paragraphs: string[]; philosophy: string[] },
        supportingMediaId: (source.supportingMediaId as number | null) ?? null,
      },
      database,
    );
  }

  const fresh = await buildVersionSnapshot(entityType, entityId, database);
  if (fresh === null) {
    return {
      ok: false,
      status: 404,
      issues: [`The ${entityType} no longer exists.`],
    };
  }
  const recorded = await recordVersion(entityType, entityId, fresh, database);
  return { ok: true, entityType, entityId, recorded };
}
