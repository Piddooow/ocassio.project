/**
 * Seeds the Global Settings singleton (§10.3) with the studio's public
 * contact email. The row is only created, or filled, when the email is
 * still empty, so an admin edit made later in the CMS is never
 * overwritten by re-running the seed. Other contact channels stay empty
 * on purpose, keeping their labeled placeholders on the public site.
 *
 * Usage: bun scripts/seed-settings.mjs
 * Also imported by scripts/verify-backend.mjs against a throwaway DB.
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** Studio-supplied general contact address (§6.12). */
export const STUDIO_CONTACT_EMAIL = "ocassio.project@gmail.com";

export function seedSettings(sqlite) {
  const existing = sqlite
    .query("SELECT id, contact_email FROM site_settings ORDER BY id LIMIT 1")
    .get();

  if (existing) {
    if (!existing.contact_email) {
      sqlite
        .query(
          "UPDATE site_settings SET contact_email = ?, updated_at = (unixepoch() * 1000) WHERE id = ?",
        )
        .run(STUDIO_CONTACT_EMAIL, existing.id);
    }
    return;
  }

  sqlite
    .query("INSERT INTO site_settings (contact_email) VALUES (?)")
    .run(STUDIO_CONTACT_EMAIL);
}

if (import.meta.main) {
  const dbPath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath, { create: true });

  const tableExists =
    sqlite
      .query(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'site_settings'",
      )
      .get().count > 0;
  if (!tableExists) {
    throw new Error(
      "Database is not migrated yet. Run `bun run db:migrate` first.",
    );
  }

  seedSettings(sqlite);
  const row = sqlite
    .query("SELECT contact_email FROM site_settings ORDER BY id LIMIT 1")
    .get();
  sqlite.close();
  console.log(
    `Seeded settings into ${dbPath} (contactEmail=${row?.contact_email ?? "null"})`,
  );
}
