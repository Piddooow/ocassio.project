/**
 * Seeds the placeholder team roster from the studio content module.
 *
 * Source of truth for the roster is src/lib/content/studio.ts
 * (TEAM_MEMBERS, owner-approved placeholders); the database then owns
 * every future edit (Admin → Studio → Team). Idempotent by name.
 *
 * Usage: bun scripts/seed-team.mjs
 * Also imported by scripts/verify-backend.mjs against a throwaway DB.
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { TEAM_MEMBERS } from "../src/lib/content/studio.ts";

export function seedTeam(sqlite) {
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const find = sqlite.query(
    "SELECT id FROM team_members WHERE name = ? ORDER BY id LIMIT 1",
  );
  const insert = sqlite.query(
    `INSERT INTO team_members
       (name, role_title, bio, sort_order, status, visibility)
     VALUES (?, ?, ?, ?, 'published', 'public')`,
  );
  const update = sqlite.query(
    `UPDATE team_members SET
       role_title = ?, bio = ?, sort_order = ?, status = 'published',
       visibility = 'public', updated_at = (unixepoch() * 1000)
     WHERE id = ?`,
  );

  const run = sqlite.transaction(() => {
    for (const member of TEAM_MEMBERS) {
      const existing = find.get(member.name);
      if (existing) {
        update.run(member.roleTitle, member.bio, member.sortOrder, existing.id);
      } else {
        insert.run(member.name, member.roleTitle, member.bio, member.sortOrder);
      }
    }
  });
  run();
}

if (import.meta.main) {
  const dbPath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath, { create: true });

  const tableExists =
    sqlite
      .query(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'team_members'",
      )
      .get().count > 0;
  if (!tableExists) {
    throw new Error(
      "Database is not migrated yet. Run `bun run db:migrate` first.",
    );
  }

  seedTeam(sqlite);
  const total = sqlite
    .query("SELECT COUNT(*) AS count FROM team_members")
    .get().count;
  sqlite.close();
  console.log(`Seeded team (${total} rows) into ${dbPath}`);
}
