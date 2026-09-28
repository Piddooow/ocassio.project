import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

/**
 * Local SQLite connection (stack decision: SQLite + Drizzle on Bun).
 * The database file lives in data/ and is never committed; migrations
 * in drizzle/ rebuild it from scratch.
 */
const DB_PATH = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";

mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export { sqlite };
export * as dbSchema from "./schema";
