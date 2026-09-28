import { asc } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  siteSettings,
  type SiteGlobalMeta,
  type SocialLink,
} from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Public Global Settings (Contact / Social, §10.3, §6.12). Settings
 * carry no draft state; every field is optional until the studio
 * connects the real value, so pages fall back to labeled placeholders.
 */

export interface PublicSiteSettings {
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialLinks: SocialLink[];
  globalMeta: SiteGlobalMeta | null;
}

/** The settings singleton; null until the studio writes it (§10.3). */
export async function getPublicSiteSettings(
  database: QueryDatabase = defaultDb,
): Promise<PublicSiteSettings | null> {
  const row = await database
    .select()
    .from(siteSettings)
    .orderBy(asc(siteSettings.id))
    .limit(1)
    .get();
  if (!row) return null;

  return {
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    address: row.address,
    socialLinks: row.socialLinks ?? [],
    globalMeta: row.globalMeta ?? null,
  };
}
