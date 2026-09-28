/**
 * Applies pending migrations to the configured SQLite database.
 *
 * Two drivers, one schema (stack decision: SQLite + Drizzle):
 *  - TURSO_DATABASE_URL set -> libSQL over HTTP (Vercel/Turso production)
 *  - otherwise              -> the local SQLite file through bun:sqlite
 *
 * Usage:
 *   bun scripts/db-migrate.mjs                       # local file
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun scripts/db-migrate.mjs
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
const tursoUrl = process.env.TURSO_DATABASE_URL;

if (tursoUrl) {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const { migrate } = await import("drizzle-orm/libsql/migrator");

  const client = createClient({
    url: tursoUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });

  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const tables = result.rows.map((row) => String(row.name));
  console.log(`Migrations applied to ${tursoUrl}`);
  console.log(`Tables: ${tables.join(", ")}`);
  client.close();
} else {
  const { drizzle } = await import("drizzle-orm/bun-sqlite");
  const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");

  mkdirSync(dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath, { create: true });
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  await migrate(drizzle(sqlite), { migrationsFolder: "drizzle" });

  const tables = sqlite
    .query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => row.name);

  console.log(`Migrations applied to ${dbPath}`);
  console.log(`Tables: ${tables.join(", ")}`);
  sqlite.close();
}
