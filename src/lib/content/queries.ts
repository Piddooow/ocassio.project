import { ARTICLES, type Article } from "./journal";
import { LEGAL_PAGES, type LegalPage } from "./legal";
import { PRICING, type PricingEntry } from "./pricing";
import { CLIENTS, RECOGNITION, type Client, type Recognition } from "./studio";
import { SERVICES, type Service } from "./services";
import { UPCOMING_PROJECTS, type UpcomingProject } from "./upcoming";
import {
  getNextProject as getNextProjectFromDb,
  getPublishedProjectBySlug as getPublishedProjectBySlugFromDb,
  getRelatedProjects as getRelatedProjectsFromDb,
  listPublishedProjects,
} from "@/lib/db/queries/projects";
import type { Project } from "./types";

/**
 * Public content queries (§6.2):
 * the public website reads only projects where
 * Status = Published AND Visibility = Public (§13, §24).
 *
 * Projects now live in the CMS (SQLite); the remaining static helpers
 * below keep serving their modules until each one moves to the database.
 */

function isPubliclyVisible(content: {
  status: string;
  visibility: string;
}): boolean {
  return content.status === "published" && content.visibility === "public";
}

/** Published + public projects, newest first (§6.2). */
export async function getPublishedProjects(): Promise<Project[]> {
  return listPublishedProjects();
}

/** A single published + public project, addressed by slug. */
export async function getPublishedProjectBySlug(
  slug: string,
): Promise<Project | undefined> {
  return getPublishedProjectBySlugFromDb(slug);
}

/** Related projects (§6.3), resolved from explicit relations only. */
export async function getRelatedProjects(project: Project): Promise<Project[]> {
  return getRelatedProjectsFromDb(project);
}

/** Next project in the published order, wrapping around (§6.3). */
export async function getNextProject(
  slug: string,
): Promise<Project | undefined> {
  return getNextProjectFromDb(slug);
}

/** Published + public services in display order (§6.4). */
export async function getPublishedServices(): Promise<Service[]> {
  return SERVICES.filter(isPubliclyVisible).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** A single published + public service, addressed by slug. */
export async function getPublishedServiceBySlug(
  slug: string,
): Promise<Service | undefined> {
  const services = await getPublishedServices();
  return services.find((service) => service.slug === slug);
}

/** Published pricing entries in display order (§6.6). */
export async function getPublishedPricing(): Promise<PricingEntry[]> {
  return PRICING.filter((entry) => entry.status === "published").sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Published + public articles, newest first. */
export async function getPublishedArticles(): Promise<Article[]> {
  return ARTICLES.filter(isPubliclyVisible).sort((a, b) =>
    b.publishDate.localeCompare(a.publishDate),
  );
}

/** Public upcoming projects (private ones never surface). */
export async function getPublicUpcomingProjects(): Promise<UpcomingProject[]> {
  return UPCOMING_PROJECTS.filter(
    (project) => project.visibility === "public",
  );
}

/** Featured, published clients. */
export async function getFeaturedClients(): Promise<Client[]> {
  return CLIENTS.filter(
    (client) => client.featured && client.status === "published",
  );
}

/** Public recognition entries, newest first. */
export async function getRecognition(): Promise<Recognition[]> {
  return RECOGNITION.filter(isPubliclyVisible).sort(
    (a, b) => b.year - a.year,
  );
}

/** A published legal page (privacy / terms) by slug. */
export async function getLegalPage(slug: string): Promise<LegalPage | undefined> {
  return LEGAL_PAGES.find(
    (page) => page.slug === slug && page.status === "published",
  );
}
