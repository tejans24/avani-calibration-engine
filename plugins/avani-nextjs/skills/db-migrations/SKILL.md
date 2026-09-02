---
name: db-migrations
description: Follow the Avani Prisma migration procedure — stage-gated commands, append-only migrations, expand/contract for post-launch changes. Never db push outside dev.
when_to_use: Whenever changing prisma/schema.prisma, creating or applying migrations, seeding or resetting a database, classifying a post-launch schema change, or before ANY command that touches a non-dev database.
---

# Database Migrations (Prisma)

The blueprint stamps identical commands into every project; this procedure is how they are used. **Check the stage first**: resolve `AVANI_STAGE` (`dev` | `staging` | `production`, default `dev`; fallback: branch mapping — `feature/*` → dev, `main` → staging, release → production).

**The commands below are the stable surface — use them, not the underlying tool's CLI.** Each script absorbs the current tool's flags and quirks, so an ORM upgrade (or a swap) changes the scripts while this procedure stays true.

## Commands

| Command | Does | Allowed stage |
|---|---|---|
| `npm run db:migrate:dev` | create + apply a migration from schema changes | dev only |
| `npm run db:migrate:deploy` | apply pending committed migrations | any (it's the deploy step) |
| `npm run db:reset` | drop + recreate + migrate + seed | **dev only** (guarded) |
| `npm run db:seed` | rich dev seed data | **dev only** (guarded — refuses otherwise) |
| `npm run db:seed:demo` | curated presentable data | staging / demo |
| `npm run db:init` | reference data only (roles, categories) | any — this is initialization, not seeding |
| `npm run db:studio` | Prisma Studio | dev |

## Hard rules

- **Never push a schema directly to any non-dev database** (`prisma db push` and its equivalents). Schema changes reach staging/production only as committed migrations applied by `db:migrate:deploy`.
- **Migrations are append-only.** Never edit or delete a migration that has been committed; a wrong migration is corrected by a new one.
- **Forward-only.** No down-migrations; roll forward with a correcting migration.
- **Migrations run before app deploy** — the expand phase must be compatible with the old code (zero-downtime ordering). Wire `db:migrate:deploy` as the deploy platform's *pre-deploy command* so code and schema ship atomically: a failed migration aborts the deploy and the old build keeps serving. Never rely on a human remembering to run migrations around a deploy.
- `db:reset` and `db:seed` are guarded scripts that refuse when `AVANI_STAGE != dev`. Never bypass the guard.
- **Migration tooling changes destructive-command behavior across majors** — whether reset re-runs the seed, which flags are required, what is prompted for. The scripts encapsulate that, which is why the procedure names commands rather than CLI invocations. After any major upgrade of the ORM or migration tool, re-verify that each `db:` command still does exactly what its row above claims, and fix the script — not this procedure.

## Procedure: schema change (pre-launch / dev)

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate:dev` — name the migration for what it does (`add_note_archived_flag`).
3. Run the integration tests — they migrate a real, empty database, so the migration path itself is verified.
4. Commit schema + generated migration together.

## Procedure: schema change (post-launch)

Once real data exists, every schema change is a *data* migration. Classify it:

- **additive** (new nullable column, new table) — safe, ship as above.
- **data-shape** (rename, type change, backfill) — expand → backfill → switch → contract, each step its own deployable migration; backfill scripts carry verification queries (counts/checksums before and after).
- **destructive** (drop column/table) — only as the final contract step of an expand/contract sequence, and only after the code paths reading it are gone in production.

When unsure of the class, treat it as the more dangerous one and say so in the PR.
