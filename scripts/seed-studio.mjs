/**
 * Seeds the Studio About singleton from the studio content module.
 * Team, clients, and recognition stay empty until the studio provides
 * the real lists (placeholders render on the public page meanwhile).
 *
 * Usage: bun scripts/seed-studio.mjs
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { STUDIO_ABOUT } from "../src/lib/content/studio.ts";

export function seedStudio(sqlite) {
  const body = JSON.stringify({
    paragraphs: STUDIO_ABOUT.paragraphs,
    philosophy: STUDIO_ABOUT.philosophy,
  });
  const existing = sqlite
    .query("SELECT id FROM studio_about ORDER BY id LIMIT 1")
    .get();
  if (existing) {
    sqlite
      .query(
        "UPDATE studio_about SET heading = ?, body = ?, updated_at = (unixepoch() * 1000) WHERE id = ?",
      )
      .run(STUDIO_ABOUT.heading, body, existing.id);
  } else {
    sqlite
      .query("INSERT INTO studio_about (heading, body) VALUES (?, ?)")
      .run(STUDIO_ABOUT.heading, body);
  }
}

function main() {
  const dbPath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath, { create: true });

  const tableExists =
    sqlite
      .query(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'studio_about'",
      )
      .get().count > 0;
  if (!tableExists) {
    throw new Error(
      "Database is not migrated yet. Run `bun run db:migrate` first.",
    );
  }

  seedStudio(sqlite);
  sqlite.close();
  console.log(`Seeded Studio About into ${dbPath}`);
}

if (import.meta.main) {
  main();
}
