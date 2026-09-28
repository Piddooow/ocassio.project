/**
 * Seeds legal pages (privacy, terms) into SQLite.
 * Source of truth is the frontend content module (src/lib/content/legal.ts)
 * so the database and the current site cannot drift apart.
 * Idempotent: safe to run repeatedly.
 *
 * Usage: bun scripts/seed-legal.mjs
 * Also imported by scripts/verify-backend.mjs against a throwaway DB.
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { LEGAL_PAGES } from "../src/lib/content/legal.ts";

export function seedLegal(sqlite) {
  const run = sqlite.transaction(() => {
    const upsert = sqlite.query(
      `INSERT INTO legal_pages (title, slug, body, updated_date, status)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         title = excluded.title,
         body = excluded.body,
         updated_date = excluded.updated_date,
         status = excluded.status`,
    );
    for (const page of LEGAL_PAGES) {
      upsert.run(
        page.title,
        page.slug,
        JSON.stringify(page.blocks),
        page.updatedDate,
        page.status,
      );
    }
  });
  run();
}

function main() {
  const dbPath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath, { create: true });

  const tableExists =
    sqlite
      .query(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'legal_pages'",
      )
      .get().count > 0;
  if (!tableExists) {
    throw new Error(
      "Database is not migrated yet. Run `bun run db:migrate` first.",
    );
  }

  seedLegal(sqlite);

  const rows = sqlite
    .query("SELECT slug, status FROM legal_pages ORDER BY slug")
    .all();
  console.log(
    `Seeded ${rows.length} legal pages into ${dbPath}: ${rows
      .map((row) => `${row.slug} (${row.status})`)
      .join(", ")}`,
  );
  sqlite.close();
}

if (import.meta.main) {
  main();
}
