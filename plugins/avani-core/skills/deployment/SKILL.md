---
name: deployment
description: Follow the Avani deployment procedure — environments and promotion, migrate before deploy, forward-only releases, backup before data-shape changes, health as the definition of deployed, secrets never in the repo, and production deployed only by CI under the human gate.
when_to_use: When a task touches a deploy workflow, environment configuration, secrets, backups, a release or rollback, a health check, or asks whether something can be deployed — and when a session is tempted to deploy or apply infrastructure itself.
---

# Deployment

The deploy target is **proposed by the engine and decided by the owner**; the proposal, the decision, and the reason are recorded in `.avani/manifest.json` (`decisions.infra`) and the roadmap's decision log, and `CLAUDE.md` names the result. The target selects a deploy profile that fixes where migrations run, how secrets reach the platform, what is backed up, and who may release. A session works *inside* that profile. It never re-decides the target, and never improvises a deploy path the profile doesn't have — changing either is a decision-log entry made by the owner. If the manifest still says the target is `proposed`, no decision has been made: nothing deploys, and the session's job is to surface the open decision to the owner — point them at `.avani/decisions/infra.md`, which lists every option with its fit and trade-offs — not to resolve it.

## Environments

Three, always: **dev**, **staging**, **production**. Dev is disposable (reset freely). Staging is production-shaped: same pipeline, same migrations, real data volumes where possible, and the place a release is proven before it is promoted. Production is the only environment whose database is not disposable; the stage system (`AVANI_STAGE`) arms the extra ceremony there and nowhere else.

A preview environment, where the profile provides one, is dev: it may be created and destroyed by automation and never holds real data.

## Promotion is forward-only

- A release moves dev → staging → production as the **same artifact**; nothing is rebuilt between environments.
- Rollback means **redeploying the previous artifact**. Never run a down-migration: a migration that claims to un-backfill data is a lie (VISION §14). If a schema change must be undone, that is a new forward migration.
- The only exception to "same artifact" is configuration, and configuration lives outside the artifact (see Secrets).

## Migrate before deploy, atomically

- Pending migrations apply **before** the new application version takes traffic, in the same release step, so a failed migration aborts the release and the old version keeps serving. Every profile has one named place where this happens; use it and no other.
- Pre-launch, migrations only need to apply cleanly from empty — the integration tier proves this on every run. Post-launch, every schema change is a data migration: follow the expand → backfill → switch → contract procedure in the `db-migrations` skill, one phase per release.
- Never push schema state directly at a non-dev database. Migrations only.

## Backup before you change the shape of data

- Before any data-shape or destructive migration reaches staging or production, take the backup the profile names (a snapshot, a dump) **and confirm it exists** before the migration runs. A backup that was scheduled is not a backup that was taken.
- A backup is only real once a restore of it has succeeded somewhere. Restore verification is part of the backup job, not an annual exercise.
- Reset of a non-dev database is a runbook action by the owner, never a script a session runs.

## "Deployed" means healthy

The release is done when, in order: migrations applied, the new version is serving, the health endpoint answers, and the smoke checks pass against the environment. Watch the logs for the first minutes after a production release; the first error after a deploy is the deploy's until proven otherwise. A release that is "up" but failing health is a failed release — roll it back, don't debug it in place.

## Secrets

- Secret values are never in the repository, never in a generated file, never pasted into a prompt or a report. A session that needs to know whether a secret is set checks for its *presence*, not its value.
- One source of truth per profile (the repository's secret store, the cloud's secret manager); the deploy workflow moves values from there to the platform. Rotating a secret is changing it at the source and re-running that sync — not editing the platform by hand.
- Every variable the app needs is declared in the environment manifest (`.env.example`) with a comment. The app refuses to start without the required ones. An undeclared variable is a bug even if it works.

## Who deploys

- **Production is deployed by CI under the production gate** (a protected environment with a required reviewer), from a release tag or an explicit dispatch. A session or subagent prepares the change — workflow, config, infrastructure code, plan or diff attached — and stops there. It never runs a deploy command, applies infrastructure, or flips an environment itself, in any environment.
- Staging deploys are automated from the base branch; a session still never triggers one by hand.
- The bounds per role (what an infra worker owns, what a feature worker never touches) are in the project's `.claude/agents/` definitions and the `orchestration` skill. When a task needs something outside its bounds, it stops and escalates; it does not widen itself.

## After the release

Append a one-line handoff note to the roadmap: what shipped, the migration classification, anything surprising in the logs. The next session reads that, not the deploy log.
