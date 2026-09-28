import { asc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  SOCIAL_PLATFORMS,
  siteSettings,
  type SiteGlobalMeta,
  type SocialLink,
} from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin Global Settings (§10.3). Transport-agnostic; the admin route
 * owns authentication and HTTP statuses. Covers the contact channels
 * plus the studio identity fields (studio name, tagline, CTA, copyright,
 * social image, default SEO).
 */

export interface SiteGlobalMetaPatch {
  studioName?: string | null;
  tagline?: string | null;
  defaultCta?: { label: string; href: string } | null;
  copyright?: string | null;
  defaultSocialImage?: string | null;
  seo?: { title?: string | null; description?: string | null };
}

export interface SiteSettingsInput {
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialLinks: SocialLink[];
  globalMeta: SiteGlobalMetaPatch;
}

export type ValidationResult =
  | { ok: true; value: Partial<SiteSettingsInput> }
  | { ok: false; errors: string[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

export function validateSiteSettingsInput(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<SiteSettingsInput> = {};

  if (
    body.contactEmail === undefined &&
    body.contactPhone === undefined &&
    body.address === undefined &&
    body.socialLinks === undefined &&
    body.globalMeta === undefined
  ) {
    errors.push("Provide at least one settings field.");
  }

  if (body.contactEmail !== undefined) {
    const email = optionalText(body.contactEmail, "contactEmail", 160, errors);
    if (email !== undefined) {
      if (email !== null && !EMAIL_PATTERN.test(email)) {
        errors.push("contactEmail must be a valid email address.");
      } else {
        value.contactEmail = email;
      }
    }
  }
  if (body.contactPhone !== undefined) {
    const phone = optionalText(body.contactPhone, "contactPhone", 40, errors);
    if (phone !== undefined) value.contactPhone = phone;
  }
  if (body.address !== undefined) {
    const address = optionalText(body.address, "address", 300, errors);
    if (address !== undefined) value.address = address;
  }
  if (body.socialLinks !== undefined) {
    if (!Array.isArray(body.socialLinks)) {
      errors.push("socialLinks must be an array of platform links.");
    } else if (body.socialLinks.length > SOCIAL_PLATFORMS.length) {
      errors.push(
        `socialLinks must hold ${SOCIAL_PLATFORMS.length} links or fewer.`,
      );
    } else {
      const links: SocialLink[] = [];
      let valid = true;
      for (const [index, entry] of body.socialLinks.entries()) {
        if (typeof entry !== "object" || entry === null) {
          errors.push(`socialLinks[${index}] must be an object.`);
          valid = false;
          break;
        }
        const candidate = entry as Record<string, unknown>;
        if (
          !SOCIAL_PLATFORMS.includes(
            candidate.platform as (typeof SOCIAL_PLATFORMS)[number],
          )
        ) {
          errors.push(
            `socialLinks[${index}].platform must be one of: ${SOCIAL_PLATFORMS.join(", ")}.`,
          );
          valid = false;
          break;
        }
        if (
          typeof candidate.url !== "string" ||
          !/^https?:\/\//i.test(candidate.url.trim()) ||
          candidate.url.trim().length > 300
        ) {
          errors.push(
            `socialLinks[${index}].url must be a full https:// URL.`,
          );
          valid = false;
          break;
        }
        if (
          links.some((link) => link.platform === candidate.platform)
        ) {
          errors.push(`socialLinks[${index}] duplicates a platform.`);
          valid = false;
          break;
        }
        links.push({
          platform: candidate.platform as SocialLink["platform"],
          url: candidate.url.trim(),
        });
      }
      if (valid) value.socialLinks = links;
    }
  }

  if (body.globalMeta !== undefined) {
    if (
      typeof body.globalMeta !== "object" ||
      body.globalMeta === null ||
      Array.isArray(body.globalMeta)
    ) {
      errors.push("globalMeta must be a JSON object.");
    } else {
      const raw = body.globalMeta as Record<string, unknown>;
      const meta: SiteGlobalMetaPatch = {};
      const readMetaText = (
        key: "studioName" | "tagline" | "copyright" | "defaultSocialImage",
        limit: number,
      ) => {
        if (raw[key] === undefined) return;
        const field = optionalText(raw[key], `globalMeta.${key}`, limit, errors);
        if (field !== undefined) meta[key] = field;
      };
      readMetaText("studioName", 80);
      readMetaText("tagline", 140);
      readMetaText("copyright", 120);
      readMetaText("defaultSocialImage", 500);

      if (raw.defaultCta !== undefined) {
        if (raw.defaultCta === null) {
          meta.defaultCta = null;
        } else if (typeof raw.defaultCta !== "object") {
          errors.push("globalMeta.defaultCta must be an object or null.");
        } else {
          const cta = raw.defaultCta as Record<string, unknown>;
          const label = typeof cta.label === "string" ? cta.label.trim() : "";
          const href = typeof cta.href === "string" ? cta.href.trim() : "";
          if (!label || label.length > 60) {
            errors.push(
              "globalMeta.defaultCta.label must be 1-60 characters.",
            );
          } else if (
            !href ||
            (!href.startsWith("/") && !/^https?:\/\//i.test(href)) ||
            href.length > 300
          ) {
            errors.push(
              "globalMeta.defaultCta.href must be an internal path or full URL.",
            );
          } else {
            meta.defaultCta = { label, href };
          }
        }
      }

      if (raw.seo !== undefined) {
        if (raw.seo === null) {
          meta.seo = {};
        } else if (typeof raw.seo !== "object") {
          errors.push("globalMeta.seo must be an object.");
        } else {
          const seo = raw.seo as Record<string, unknown>;
          const seoPatch: { title?: string | null; description?: string | null } =
            {};
          if (seo.title !== undefined) {
            const title = optionalText(
              seo.title,
              "globalMeta.seo.title",
              160,
              errors,
            );
            if (title !== undefined) seoPatch.title = title;
          }
          if (seo.description !== undefined) {
            const description = optionalText(
              seo.description,
              "globalMeta.seo.description",
              320,
              errors,
            );
            if (description !== undefined) seoPatch.description = description;
          }
          meta.seo = seoPatch;
        }
      }

      if (Object.keys(meta).length === 0) {
        errors.push("globalMeta must include at least one field.");
      } else {
        value.globalMeta = meta;
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function getSiteSettingsRow(
  database: QueryDatabase = defaultDb,
) {
  return database
    .select()
    .from(siteSettings)
    .orderBy(asc(siteSettings.id))
    .limit(1)
    .all()[0];
}

/** Merges a global-meta patch over the stored identity fields. */
function mergeGlobalMeta(
  existing: SiteGlobalMeta | null | undefined,
  patch: SiteGlobalMetaPatch,
): SiteGlobalMeta {
  const merged: SiteGlobalMeta = { ...(existing ?? {}) };
  if (patch.studioName !== undefined) {
    if (patch.studioName === null) delete merged.studioName;
    else merged.studioName = patch.studioName;
  }
  if (patch.tagline !== undefined) {
    if (patch.tagline === null) delete merged.tagline;
    else merged.tagline = patch.tagline;
  }
  if (patch.copyright !== undefined) {
    if (patch.copyright === null) delete merged.copyright;
    else merged.copyright = patch.copyright;
  }
  if (patch.defaultSocialImage !== undefined) {
    merged.defaultSocialImage = patch.defaultSocialImage;
  }
  if (patch.defaultCta !== undefined) {
    if (patch.defaultCta === null) delete merged.defaultCta;
    else merged.defaultCta = patch.defaultCta;
  }
  if (patch.seo !== undefined) {
    const seo: { title?: string; description?: string } = {
      ...(merged.seo ?? {}),
    };
    if (patch.seo.title !== undefined) {
      if (patch.seo.title === null) delete seo.title;
      else seo.title = patch.seo.title;
    }
    if (patch.seo.description !== undefined) {
      if (patch.seo.description === null) delete seo.description;
      else seo.description = patch.seo.description;
    }
    merged.seo = seo;
  }
  return merged;
}

/**
 * Creates the singleton on first write, then patches it. Global meta
 * merges field by field so a contact-only save never erases identity.
 */
export async function upsertSiteSettings(
  patch: Partial<SiteSettingsInput>,
  database: QueryDatabase = defaultDb,
) {
  const existing = await getSiteSettingsRow(database);
  if (!existing) {
    return database
      .insert(siteSettings)
      .values({
        contactEmail: patch.contactEmail ?? null,
        contactPhone: patch.contactPhone ?? null,
        address: patch.address ?? null,
        socialLinks: patch.socialLinks ?? [],
        globalMeta: patch.globalMeta
          ? mergeGlobalMeta(null, patch.globalMeta)
          : null,
      })
      .returning()
      .all()[0];
  }

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.contactEmail !== undefined) values.contactEmail = patch.contactEmail;
  if (patch.contactPhone !== undefined) values.contactPhone = patch.contactPhone;
  if (patch.address !== undefined) values.address = patch.address;
  if (patch.socialLinks !== undefined) values.socialLinks = patch.socialLinks;
  if (patch.globalMeta !== undefined) {
    values.globalMeta = mergeGlobalMeta(existing.globalMeta, patch.globalMeta);
  }

  return database
    .update(siteSettings)
    .set(values)
    .where(eq(siteSettings.id, existing.id))
    .returning()
    .all()[0];
}
