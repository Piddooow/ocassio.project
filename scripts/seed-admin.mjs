/**
 * Creates or updates an owner account from the environment (§27).
 *
 * Usage:
 *   OCASSIO_ADMIN_EMAIL=you@studio.com OCASSIO_ADMIN_PASSWORD='...' bun scripts/seed-admin.mjs
 *
 * Idempotent by email: re-running resets that owner's password, role,
 * and status. Passwords are hashed with Bun.password (argon2id).
 */
import { Database } from "bun:sqlite";

const email = (process.env.OCASSIO_ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.OCASSIO_ADMIN_PASSWORD ?? "";
const name = (process.env.OCASSIO_ADMIN_NAME ?? "Studio Owner").trim();

if (!email || !password) {
  console.error(
    "Set OCASSIO_ADMIN_EMAIL and OCASSIO_ADMIN_PASSWORD first, then run again.",
  );
  process.exit(1);
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const dbPath = process.env.OCASSIO_DB_PATH ?? "data/ocassio.db";
const sqlite = new Database(dbPath, { create: true });
const passwordHash = await Bun.password.hash(password);

sqlite
  .query(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES (?, ?, ?, 'owner', 'active')
     ON CONFLICT(email) DO UPDATE SET
       name = excluded.name,
       password_hash = excluded.password_hash,
       role = 'owner',
       status = 'active',
       updated_at = (unixepoch() * 1000)`,
  )
  .run(name, email, passwordHash);

sqlite.close();
console.log(`Owner ready: ${email} (${dbPath})`);
