/**
 * Imports a SQLite dump (sqlite3 .dump) into the configured libSQL
 * database (Turso in production). Used once to move the studio's current
 * database into Turso; re-runnable only with --force, which drops every
 * existing table first.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... \
 *     bun scripts/import-dump-to-turso.mjs <dump.sql> [--force]
 *
 * Local dry run against a scratch file:
 *   TURSO_DATABASE_URL=file:/tmp/import-test.db bun scripts/import-dump-to-turso.mjs dump.sql
 */
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const dumpPath = process.argv[2];
const force = process.argv.includes("--force");
const url = process.env.TURSO_DATABASE_URL;

if (!dumpPath) {
  console.error("Usage: bun scripts/import-dump-to-turso.mjs <dump.sql> [--force]");
  process.exit(1);
}
if (!url) {
  console.error("Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN for Turso).");
  process.exit(1);
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const existing = await client.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
);
const existingTables = existing.rows.map((row) => String(row.name));

if (existingTables.length > 0 && !force) {
  console.error(
    `Refusing to import: target already has ${existingTables.length} tables ` +
      `(${existingTables.slice(0, 6).join(", ")}${existingTables.length > 6 ? ", …" : ""}).`,
  );
  console.error("Re-run with --force to drop them and import the dump.");
  process.exit(1);
}

if (existingTables.length > 0 && force) {
  console.log(`Dropping ${existingTables.length} existing tables…`);
  for (const name of existingTables) {
    await client.execute(`DROP TABLE IF EXISTS "${name.replaceAll('"', '""')}"`);
  }
}

const dump = readFileSync(dumpPath, "utf8");
console.log(`Importing ${dumpPath} (${(dump.length / 1024).toFixed(0)} KB)…`);
await client.executeMultiple(dump);

const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
);
const names = tables.rows.map((row) => String(row.name));
console.log(`Imported ${names.length} tables.`);

for (const table of [
  "users",
  "projects",
  "project_media",
  "articles",
  "article_blocks",
  "services",
  "pricing",
  "process_steps",
  "team_members",
  "clients",
  "recognition",
  "legal_pages",
  "site_settings",
  "navigation_items",
  "upcoming_projects",
  "inquiries",
  "likes",
  "media_assets",
  "version_history",
  "__drizzle_migrations",
]) {
  if (!names.includes(table)) continue;
  const count = await client.execute(`SELECT COUNT(*) AS n FROM "${table}"`);
  console.log(`  ${table}: ${count.rows[0]?.n ?? 0}`);
}

client.close();
console.log("Import complete.");
