import type { MetadataRoute } from "next";
import { listPublicArticles } from "@/lib/db/queries/articles";
import { listPublishedProjects } from "@/lib/db/queries/projects";
import { listPublishedServices } from "@/lib/db/queries/services";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/* Realtime: the sitemap re-reads the database per request so newly
   published pages appear without a redeploy. */
export const dynamic = "force-dynamic";

const STATIC_ROUTES = [
  "",
  "/work",
  "/services",
  "/pricing",
  "/process",
  "/about",
  "/journal",
  "/now",
  "/contact",
  "/start-project",
  "/privacy",
  "/terms",
];

/** Public sitemap: documented routes plus every published content page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, services, articleList] = await Promise.all([
    listPublishedProjects(),
    listPublishedServices(),
    listPublicArticles({ limit: 500, offset: 0 }),
  ]);
  const articles = articleList.items;

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE}${route}`,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));

  for (const project of projects) {
    entries.push({
      url: `${BASE}/work/${project.slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  for (const service of services) {
    entries.push({
      url: `${BASE}/services/${service.slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  for (const article of articles) {
    entries.push({
      url: `${BASE}/journal/${article.slug}`,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}
