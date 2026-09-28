import { asc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { homepageSections } from "@/lib/db/schema";
import { HOME_SECTIONS } from "@/lib/content/home";
import type { QueryDatabase } from "./upcoming";

/**
 * Homepage sections (§10.1): the registry is fixed by the architecture
 * (Hero and the final CTA are mandatory), while order and visibility are
 * CMS-managed. With no rows saved the documented default order applies.
 */

export interface HomepageSectionState {
  key: string;
  label: string;
  theme: "dark" | "light";
  required: boolean;
  visible: boolean;
}

export type HomepageSectionsPayload = {
  order: string[];
  sections: Array<{ key: string; visible: boolean }>;
};

export type HomepageValidation =
  | { ok: true; value: HomepageSectionsPayload }
  | { ok: false; issues: string[] };

const REGISTRY_KEYS = HOME_SECTIONS.map((section) => section.key);
const REQUIRED_KEYS = HOME_SECTIONS.filter((section) => section.required).map(
  (section) => section.key,
);

export function validateHomepageSections(
  raw: unknown,
): HomepageValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, issues: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const issues: string[] = [];

  const order = body.order;
  if (!Array.isArray(order) || order.length !== REGISTRY_KEYS.length) {
    issues.push(
      `order must list all ${REGISTRY_KEYS.length} section keys exactly once.`,
    );
  } else {
    const seen = new Set<string>();
    for (const key of order) {
      if (typeof key !== "string" || !REGISTRY_KEYS.includes(key)) {
        issues.push(`order contains an unknown section key: ${String(key)}.`);
        break;
      }
      if (seen.has(key)) {
        issues.push(`order repeats the section key: ${key}.`);
        break;
      }
      seen.add(key);
    }
  }

  const sections = body.sections;
  const visibleByKey = new Map<string, boolean>();
  if (!Array.isArray(sections)) {
    issues.push("sections must be an array of { key, visible }.");
  } else {
    for (const entry of sections) {
      if (typeof entry !== "object" || entry === null) {
        issues.push("sections entries must be objects.");
        break;
      }
      const candidate = entry as Record<string, unknown>;
      if (
        typeof candidate.key !== "string" ||
        !REGISTRY_KEYS.includes(candidate.key)
      ) {
        issues.push(`sections contains an unknown key: ${String(candidate.key)}.`);
        break;
      }
      if (typeof candidate.visible !== "boolean") {
        issues.push(`sections[${candidate.key}].visible must be a boolean.`);
        break;
      }
      visibleByKey.set(candidate.key, candidate.visible);
    }
    if (visibleByKey.size !== REGISTRY_KEYS.length && issues.length === 0) {
      issues.push("sections must cover every registry key.");
    }
    for (const key of REQUIRED_KEYS) {
      if (visibleByKey.get(key) === false) {
        issues.push(`${key} is required and cannot be hidden.`);
      }
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      order: (order as string[]).slice(),
      sections: [...visibleByKey.entries()].map(([key, visible]) => ({
        key,
        visible,
      })),
    },
  };
}

/** Registry merged with stored overrides, in display order. */
export async function listHomepageSections(
  database: QueryDatabase = defaultDb,
): Promise<HomepageSectionState[]> {
  const rows = database
    .select()
    .from(homepageSections)
    .orderBy(asc(homepageSections.sortOrder), asc(homepageSections.id))
    .all();
  const byKey = new Map(rows.map((row) => [row.sectionKey, row]));

  if (rows.length === 0) {
    return HOME_SECTIONS.map((section) => ({ ...section, visible: true }));
  }

  const orderedKeys = rows.map((row) => row.sectionKey);
  const missingKeys = REGISTRY_KEYS.filter((key) => !byKey.has(key));
  const allKeys = [...orderedKeys, ...missingKeys];

  return allKeys
    .map((key) => HOME_SECTIONS.find((section) => section.key === key))
    .filter((section): section is (typeof HOME_SECTIONS)[number] =>
      Boolean(section),
    )
    .map((section) => ({
      ...section,
      visible: byKey.get(section.key)?.visible ?? true,
    }));
}

/** Public homepage: visible sections in display order. */
export async function listPublicHomepageSections(
  database: QueryDatabase = defaultDb,
) {
  const sections = await listHomepageSections(database);
  return sections
    .filter((section) => section.visible)
    .map((section) => ({ key: section.key, label: section.label }));
}

/** Replaces the stored order and visibility in one transaction. */
export async function applyHomepageSections(
  payload: HomepageSectionsPayload,
  database: QueryDatabase = defaultDb,
) {
  const visibleByKey = new Map(
    payload.sections.map((section) => [section.key, section.visible]),
  );
  database.transaction((tx) => {
    tx.delete(homepageSections).run();
    payload.order.forEach((key, index) => {
      tx.insert(homepageSections)
        .values({
          sectionKey: key,
          sortOrder: index,
          visible: visibleByKey.get(key) ?? true,
          updatedAt: new Date(),
        })
        .run();
    });
  });
  return listHomepageSections(database);
}

export { REGISTRY_KEYS as HOMEPAGE_SECTION_KEYS };
