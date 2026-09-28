import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

/**
 * SQLite connection, driver-agnostic between environments (stack decision:
 * SQLite + Drizzle, schema and migrations unchanged):
 *  - production: Turso (libSQL over HTTP) via TURSO_DATABASE_URL and
 *    TURSO_AUTH_TOKEN, so the same queries run on Vercel's serverless runtime
 *  - local dev and the verification suites: the SQLite file in data/
 *    through libSQL's `file:` URL
 * The database file is never committed; migrations in drizzle/ rebuild it.
 */
const DB_PATH = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";

function databaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (DB_PATH.startsWith("file:")) return DB_PATH;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  return `file:${DB_PATH}`;
}

export const client = createClient({
  url: databaseUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export * as dbSchema from "./schema";
