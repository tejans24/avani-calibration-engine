# selection-map

**Version:** 1.0.0

The rules that turn calibration dials + signals into selected plugins, blueprints, invariants, and patterns. A provision under more than one branch is *shared* across branches.

## Branches → options

### `always`

Applies to every project (Tier 1 baseline).

- `plugin:avani-core` — Universal, language-agnostic standards: security, git workflow, testing discipline, stage detection.

### `runtime:ts-nextjs`

App runs on the TypeScript / Next.js stack.

- `plugin:avani-typescript` — TypeScript-strict conventions, Zod-at-the-boundary, service-oriented structure.
- `plugin:avani-nextjs` — App Router, RHF + Zod forms, Prisma + db-migrations procedure.
- `blueprint:ts-nextjs-prisma` — npm db scripts + CI/deploy workflows with prisma migrate deploy as a release step.
- `pattern:nextjs-app-router` — Next.js App Router routing conventions.
- `pattern:react-hook-form-zod` — React Hook Form wired to shared Zod schemas.

### `runtime:python`

App runs on the Python stack (small APIs, ML, data).

- `plugin:avani-python` — uv, ruff, pytest, FastAPI layout, Pydantic-at-the-boundary.
- `blueprint:python-fastapi` — pyproject (uv), ruff + pytest config, service skeleton, CI caller.

### `signal:offline`

App must function offline.

- `plugin:avani-offline` — Offline sync engine, Zustand queue, PWA manifest.
- `pattern:zustand-offline-queue` — Zustand store backing an offline write queue.
- `pattern:pwa-manifest` — PWA manifest + service worker for installable offline use.
- `invariant:observation_id_uniqueness` — Every observation carries a globally unique id (offline-sync idempotency).

### `signal:geo`

App stores protected location data.

- `plugin:avani-postgis` — PostGIS setup and geo queries.
- `pattern:prisma-postgis` — Prisma with the PostGIS extension for geo columns.
- `invariant:geo_coordinate_fuzzing_public_views` — Public-facing exports fuzz coordinates; exact coords are admin-only. _(shared ×2)_

### `signal:payments`

App handles payments.

- `plugin:avani-stripe` — Stripe payment invariants and webhook handlers.
- `invariant:payment_amount_reconciliation` — Charged amounts reconcile against source-of-truth line items.

### `signal:auth-clerk`

App uses Clerk authentication.

- `plugin:avani-clerk` — Clerk roles, middleware, and invite flows.

### `correctness:append-only`

Data provenance requires append-only records.

- `invariant:observations_append_only_never_delete` — Records are never deleted, only superseded with a correction flag.

### `sensitivity:protected`

Highest data-sensitivity tier.

- `invariant:geo_coordinate_fuzzing_public_views` — Public-facing exports fuzz coordinates; exact coords are admin-only. _(shared ×2)_

### `topology:monorepo`

Project spans multiple apps.

- `blueprint:monorepo-root` — npm-workspaces root, apps/ + packages/shared layout, root CLAUDE.md.

### `domain:field-data`

A field-app profile at high+ sensitivity — the domain moat.

- `plugin:avani-field-data` — Domain moat: offline-sync, coordinate-fuzzing, append-only invariants.
- `invariant:session_expires_event_plus_24hrs` — Field sessions expire 24h after the event they belong to.

## Shared across branches

| Provision | Kind | Selected by |
|---|---|---|
| `invariant:geo_coordinate_fuzzing_public_views` | invariant | `signal:geo`, `sensitivity:protected` |

> Generated from the Zod/TS source by `npm run selection:build`. Do not edit by hand.
