/**
 * Applies pending migrations from drizzle/ to the local SQLite database.
 * Usage: bun scripts/db-migrate.mjs
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const dbPath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath, { create: true });
sqlite.exec("PRAGMA foreign_keys = ON;");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "drizzle" });

const tables = sqlite
  .query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  .all()
  .map((row) => row.name);

console.log(`Migrations applied to ${dbPath}`);
console.log(`Tables: ${tables.join(", ")}`);
