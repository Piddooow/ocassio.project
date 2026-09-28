# Deployment

**Live:** https://ocassio-project.vercel.app

## Architecture

| Layer | Service | Notes |
| --- | --- | --- |
| Code | GitHub `Piddooow/ocassio.project` | pushes to `main` auto-deploy |
| App | Vercel project `piddooows-projects/ocassio-project` | build pinned in `vercel.json` |
| Database | Turso `ocassio-db` (Vercel Marketplace) | libSQL; `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` |
| Media library (635 MB) | Vercel Blob store `ocassio-media` (sin1) | served via `NEXT_PUBLIC_MEDIA_BASE_URL` |
| Runtime uploads | Vercel Blob on deployments, local disk in development | selected in `src/lib/media/storage.ts` |

Public pages re-read the database on every request (`force-dynamic`), so an
admin edit shows on the public site immediately — no redeploy, no cache to
purge. Local development keeps the SQLite file `data/ocassio.db` and disk
storage; the driver is libSQL in both environments, so the code path is the
same.

## Environment variables

Vercel (Production + Preview): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
`BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_MEDIA_BASE_URL`,
`NEXT_PUBLIC_SITE_URL`.

Locally these live in `.env.local` (gitignored); refresh with
`vercel env pull .env.local`.

`OCASSIO_ADMIN_TOKEN` is intentionally **not set** in production: the
bearer-token path stays disabled (503) and admin access goes through
signed-in sessions only. It is used locally so the verification suites can
exercise the machine path.

## Deploying

Push to `main`; Vercel runs `next build` (pinned in `vercel.json`) and ships
the deployment. No manual step is required.

Videos and photos are **not** in the deployment (a 115 MB video exceeds
deployment limits). They are served from Blob and must be re-uploaded after
a media rebuild:

```bash
bun scripts/build-media.mjs              # regenerates public/media locally
bun scripts/upload-media-to-blob.mjs     # idempotent, same paths
```

## Database operations

One-off import of the local database into Turso (already performed):

```bash
sqlite3 data/ocassio.db .dump > /tmp/ocassio.sql
bun scripts/import-dump-to-turso.mjs /tmp/ocassio.sql --force
```

New migrations (both drivers; the script picks libSQL when
`TURSO_DATABASE_URL` is set):

```bash
TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… bun scripts/db-migrate.mjs
```

Local seeding and the owner account:

```bash
bun run db:seed
OCASSIO_ADMIN_EMAIL=you@studio.com OCASSIO_ADMIN_PASSWORD='…' bun run db:seed:admin
```

## Verification

Local (dev server on :3000 started with `OCASSIO_ADMIN_TOKEN=dev-admin-token`):

```bash
bun run verify            # frontend (Playwright)
bun run verify:api        # HTTP API
bun run verify:backend    # query layer + rules
bun run verify:responsive # 8 viewport sweep
```

Production:

```bash
BASE_URL=https://ocassio-project.vercel.app bun scripts/verify-responsive.mjs
BASE_URL=https://ocassio-project.vercel.app bun scripts/verify-deploy.mjs
```

`verify-deploy.mjs` signs in with a temporary owner, proves the admin →
public realtime flow, then reverts every change and removes the temporary
account (it needs the Turso credentials from `.env.local`).
