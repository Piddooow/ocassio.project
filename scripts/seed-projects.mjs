/**
 * Seeds portfolio projects into SQLite from the studio content module.
 *
 * Source of truth for the existing placeholder/editorial content is
 * src/lib/content/projects.ts; the database then owns every future edit
 * (Admin → Portfolio → Projects). Idempotent by slug.
 *
 * Usage: bun scripts/seed-projects.mjs
 * Also imported by scripts/verify-backend.mjs against a throwaway DB.
 */
import { Database } from "bun:sqlite";
import { PROJECTS } from "../src/lib/content/projects.ts";

export function seedProjects(sqlite) {
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const upsert = sqlite.query(
    `INSERT INTO projects
       (title, slug, client, project_type, category, year, project_date, location,
        short_description, credits, related_slugs, status, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'public')
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title,
       client = excluded.client,
       project_type = excluded.project_type,
       category = excluded.category,
       year = excluded.year,
       project_date = excluded.project_date,
       location = excluded.location,
       short_description = excluded.short_description,
       credits = excluded.credits,
       related_slugs = excluded.related_slugs,
       updated_at = (unixepoch() * 1000)`,
  );

  const run = sqlite.transaction(() => {
    for (const project of PROJECTS) {
      upsert.run(
        project.title,
        project.slug,
        project.client ?? null,
        project.category,
        project.category,
        project.year,
        project.date,
        project.location ?? null,
        project.shortDescription,
        JSON.stringify(project.credits ?? []),
        JSON.stringify(project.relatedSlugs ?? []),
      );
    }
  });
  run();
}

if (import.meta.main) {
  const databasePath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
  const sqlite = new Database(databasePath, { create: true });
  seedProjects(sqlite);
  const total = sqlite
    .query("SELECT COUNT(*) AS count FROM projects")
    .get().count;
  sqlite.close();
  console.log(`Seeded projects (${total} rows) into ${databasePath}`);
}
