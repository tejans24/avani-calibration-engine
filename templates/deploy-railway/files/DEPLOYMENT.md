# Deployment — `railway` profile

Stamped by the Avani engine for the `railway` deploy target (engine SPEC §4.2). One long-lived container built from this repo, a Railway Postgres on a persistent volume, migrations applied atomically before each release, config synced from GitHub Secrets, a nightly verified off-platform backup, and a human gate in front of production.

**Who deploys:** CI, under the `production` GitHub Environment. Sessions and subagents prepare changes; they never run `railway up`, never touch a live environment.

## The deployment model

| Piece | Where | What it does |
|---|---|---|
| Build/start, migrate-before-deploy, health check | `railway.toml` | `preDeployCommand` applies migrations + reference data before the new container takes traffic; a failed migration aborts the release and the old container keeps serving. Traffic routes only once `/api/health` answers. |
| Config + release | `.github/workflows/deploy.yml` | On every merge to `main` (or a manual dispatch): syncs the secrets that are set in GitHub into the target Railway environment, sets `AVANI_STAGE`, runs `railway up`, then polls the health route. |
| Production gate | GitHub Environment `production` | A required reviewer pauses every production deploy for a human. |
| Backups | `.github/workflows/backup-production-db.yml` | Nightly encrypted dump, restore-verified, kept 30 days as a workflow artifact. Second layer behind Railway's own volume backups. |

## One-time setup

1. **Railway project**: one service deployed from this repo + a PostgreSQL database in the same project. Railway provides `DATABASE_URL` to the service automatically.
2. **Pipeline token**: Railway → project → Settings → Tokens → create a **production-environment** token → GitHub secret `RAILWAY_TOKEN`. Save the service name as GitHub secret `RAILWAY_SERVICE`.
3. **Disable Railway's own GitHub auto-deploy** on the service (Settings → Source), so `deploy.yml` is the only deploy path. Until `RAILWAY_TOKEN` exists the workflow no-ops green, so merging it early is safe.
4. **Production gate**: GitHub → Settings → Environments → `production` → *Required reviewers* → add the owner. Now every production deploy waits for approval.
5. **App secrets → GitHub Secrets** (Settings → Secrets and variables → Actions). Only secrets that are set get synced; unset ones are left untouched in Railway.

   | Secret | Enables |
   |---|---|
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Auth. Optional — the app runs with auth disabled until **both** are set; the pipeline refuses one without the other. |
   | `PRODUCTION_URL` | Post-deploy health check against the public URL (optional; Railway's own healthcheck still gates traffic). |
   | `PRODUCTION_DATABASE_URL` | The database's **public** connection string, read only by the backup workflow. |
   | `BACKUP_ENCRYPTION_PASSPHRASE` | Encrypts the nightly backup (`openssl rand -base64 32`). **Store it outside GitHub too** (password manager): a backup you cannot decrypt is not a backup. |

6. **Railway volume backups**: Postgres service → Backups → Daily. This is layer one; the workflow above is layer two.

Rotating a secret = change it in GitHub → run the Deploy workflow (or merge anything). Values are never read back from Railway.

## Staging

A second Railway environment, production-shaped, with disposable data. It sleeps when idle (`[environments.staging.deploy] sleepApplication = true`).

1. Railway → Environments → New → `staging` (duplicate of production) with its **own** Postgres.
2. Mint a **staging-scoped** token → GitHub secret `RAILWAY_STAGING_TOKEN`. Optionally `STAGING_URL` for the health check and `STAGING_DATABASE_URL` (it also lets the backup job refuse to run against staging by mistake).
3. Deploy any branch: Actions → Deploy → Run workflow → pick the branch, environment = `staging`. That is the pre-merge loop.

## Releases and rollback

- A release is: migrations applied → new container serving → `/api/health` answers → smoke passes. Watch the logs for the first minutes after a production deploy.
- Rollback is **forward-only**: redeploy the previous build from the Railway dashboard (Deployments → previous → Redeploy). Never run a down-migration; undo a schema change with a new forward migration.
- Post-launch schema changes follow expand → backfill → switch → contract (the `db-migrations` skill), one phase per release, with a backup confirmed before any data-shape change.

## Backups

- **Layer 1** — Railway volume backups (dashboard, daily).
- **Layer 2** — `backup-production-db.yml`: nightly `pg_dump` (custom format), restore-verified into a throwaway Postgres, AES256-encrypted, uploaded as a 30-day workflow artifact. Run it by hand (Actions → Backup Production DB) before any data-shape migration.

### Restoring from a backup

```bash
# 1. Download the artifact from the workflow run, then decrypt:
gpg --batch --decrypt --passphrase "<passphrase>" --output dump.pgc <artifact>.pgc.gpg
# 2. Restore into the target database (an EMPTY one for a full restore; --table for one table):
pg_restore --dbname="$TARGET_DATABASE_URL" --no-owner --no-acl dump.pgc
```

Practice this on staging before you need it on production.

## After a deploy

1. `/api/health` answers on the public URL.
2. Logs show no errors in the first minutes.
3. The critical flow works by hand.
4. Append a one-line handoff note to `ROADMAP.md` (what shipped, migration classification, anything surprising).
