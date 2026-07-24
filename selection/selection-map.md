# selection-map

**Version:** 1.2.0

A calibrated project composes four layers in tandem: plugins teach Claude the conventions and procedures; blueprints stamp the operational machinery those procedures drive; invariants pin the guarantees that must hold; patterns are the stack idioms the plugins apply. Each branch selects a coherent slice across all four, so the agent knows the conventions, the repo has the machinery, and the guarantees are enforced together.

## How the kinds compose

- **plugin** — How Claude behaves — skills, hooks, and procedures loaded into the agent. Centrally versioned, referenced not copied.
- **blueprint** — What gets stamped into the repo — npm scripts, GitHub Actions, config files that plugins cannot add.
- **invariant** — A guarantee enforced by tests and hooks — a property that must hold no matter what the code does.
- **pattern** — A concrete stack idiom the plugins apply — the building blocks of the chosen stack.

## Branches → options

### `always`

Applies to every project (Tier 1 baseline).

_The floor every project stands on before any calibration — safe and consistent by default._

- `plugin:avani-core` — The always-on floor every project stands on before any calibration. Everything else layers on top of it.

### `runtime:ts-nextjs`

App runs on the TypeScript / Next.js stack.

_Selects the TS conventions, the Next.js behavior + Prisma procedure, the stamped db/CI machinery, and the stack idioms — so the agent knows the stack and the repo has the commands, together._

- `plugin:avani-typescript` — Makes Claude write idiomatic, strict TypeScript with validation at the boundary — applied to every file in a ts-nextjs app.
- `plugin:avani-nextjs` — Teaches the Next.js conventions and the Prisma migration procedure (never db push in prod, migrations append-only). Pairs with the blueprint that stamps the actual commands.
- `blueprint:ts-nextjs-prisma` — Stamps the db commands and CI/deploy machinery that the avani-nextjs migration procedure operates on. The blueprint gives every project identical commands; the plugin makes Claude use them the same way.
- `pattern:nextjs-app-router` — The routing idiom avani-nextjs applies across the app.
- `pattern:react-hook-form-zod` — Forms validate against the same Zod schemas the server uses — one shape, client and server.
- `invariant:a11y_axe_clean` — The enforceable end of the accessibility standard: jsx-a11y lints at write time, axe verifies rendered pages in e2e. Semantics-based, so it holds across component libraries.

### `runtime:python`

App runs on the Python stack (small APIs, ML, data).

_Python conventions plus the FastAPI/uv skeleton, so the service is idiomatic and immediately runnable._

- `plugin:avani-python` — Makes Claude write idiomatic Python with FastAPI + Pydantic conventions; the FastAPI OpenAPI spec is the cross-language contract.
- `blueprint:python-fastapi` — Stamps the uv/ruff/pytest config and FastAPI service skeleton the avani-python conventions assume.

### `signal:offline`

App must function offline.

_Offline needs three pieces in tandem: the sync engine (plugin), the queue + installable shell (patterns), and the idempotency guarantee (invariant). None works alone._

- `plugin:avani-offline` — The offline capability: the sync engine plus the idempotency guarantee that replaying the write queue is always safe.
- `pattern:zustand-offline-queue` — The client-side write queue the offline sync engine drains when connectivity returns.
- `pattern:pwa-manifest` — Makes the app installable and usable with no network — the shell offline sync runs inside.
- `invariant:observation_id_uniqueness` — Makes replaying the offline queue idempotent — the property the sync engine depends on to be safe.

### `signal:geo`

App stores protected location data.

_Geo data pulls in PostGIS setup, the Prisma-PostGIS pattern, and the coordinate-fuzzing guarantee._

- `plugin:avani-postgis` — Teaches PostGIS setup and geo queries, and carries the coordinate-fuzzing guarantee for protected location data.
- `pattern:prisma-postgis` — The ORM wiring that lets geo queries and coordinate fuzzing work through Prisma.
- `invariant:geo_coordinate_fuzzing_public_views` — Protects sensitive locations. Selected by two branches — any geo data, and the protected sensitivity tier — the shared guarantee. **(shared ×2)**

### `signal:payments`

App handles payments.

_Payments pull in the Stripe behavior and the reconciliation guarantee that keeps charges honest._

- `plugin:avani-stripe` — Payment handling with reconciliation guarantees and the webhook-verification procedure.
- `invariant:payment_amount_reconciliation` — Guarantees money charged always ties back to authoritative line items — no silent drift.

### `signal:auth-clerk`

App uses Clerk authentication.

_Adds Clerk role-based access, middleware, and invite flows._

- `plugin:avani-clerk` — Wires Clerk authentication: role-based access, route middleware, and invite-only onboarding.

### `correctness:append-only`

Data provenance requires append-only records.

_Turns on the append-only provenance guarantee — history becomes immutable._

- `invariant:observations_append_only_never_delete` — The provenance guarantee: history is immutable, corrections are additive. Enforced by tests + hooks, taught by avani-field-data.

### `sensitivity:protected`

Highest data-sensitivity tier.

_The top tier adds the coordinate-fuzzing guarantee on top of whatever geo handling is present — which is why that invariant is shared._

- `invariant:geo_coordinate_fuzzing_public_views` — Protects sensitive locations. Selected by two branches — any geo data, and the protected sensitivity tier — the shared guarantee. **(shared ×2)**

### `topology:monorepo`

Project spans multiple apps.

_Stamps the workspace root so multiple apps share code and a generated cross-language client._

- `blueprint:monorepo-root` — Stamps the workspace root and apps/packages layout that lets multiple apps in one project share code and contracts.

### `domain:field-data`

A field-app profile at high+ sensitivity.

_The moat bundle: the field-data plugin and its session guarantee — reserved for field apps at high or protected sensitivity._

- `plugin:avani-field-data` — The domain moat for field apps — the append-only provenance, coordinate fuzzing, and session rules that make protected field data trustworthy.
- `invariant:session_expires_event_plus_24hrs` — Bounds stale-credential risk for volunteers in the field by tying session life to the event, not the login.

## Provisions

### plugins

- `plugin:avani-core` — The always-on floor every project stands on before any calibration. Everything else layers on top of it. _Works with: `monorepo-root`, `a11y_axe_clean`._
- `plugin:avani-typescript` — Makes Claude write idiomatic, strict TypeScript with validation at the boundary — applied to every file in a ts-nextjs app. _Works with: `react-hook-form-zod`, `avani-nextjs`._
- `plugin:avani-python` — Makes Claude write idiomatic Python with FastAPI + Pydantic conventions; the FastAPI OpenAPI spec is the cross-language contract. _Works with: `python-fastapi`._
- `plugin:avani-nextjs` — Teaches the Next.js conventions and the Prisma migration procedure (never db push in prod, migrations append-only). Pairs with the blueprint that stamps the actual commands. _Works with: `ts-nextjs-prisma`, `a11y_axe_clean`, `nextjs-app-router`, `react-hook-form-zod`, `avani-typescript`._
- `plugin:avani-postgis` — Teaches PostGIS setup and geo queries, and carries the coordinate-fuzzing guarantee for protected location data. _Works with: `geo_coordinate_fuzzing_public_views`, `prisma-postgis`._
- `plugin:avani-clerk` — Wires Clerk authentication: role-based access, route middleware, and invite-only onboarding.
- `plugin:avani-stripe` — Payment handling with reconciliation guarantees and the webhook-verification procedure. _Works with: `payment_amount_reconciliation`._
- `plugin:avani-offline` — The offline capability: the sync engine plus the idempotency guarantee that replaying the write queue is always safe. _Works with: `observation_id_uniqueness`, `pwa-manifest`, `zustand-offline-queue`._
- `plugin:avani-field-data` — The domain moat for field apps — the append-only provenance, coordinate fuzzing, and session rules that make protected field data trustworthy. _Works with: `geo_coordinate_fuzzing_public_views`, `observations_append_only_never_delete`, `session_expires_event_plus_24hrs`._

### blueprints

- `blueprint:ts-nextjs-prisma` — Stamps the db commands and CI/deploy machinery that the avani-nextjs migration procedure operates on. The blueprint gives every project identical commands; the plugin makes Claude use them the same way. _Works with: `avani-nextjs`._
- `blueprint:python-fastapi` — Stamps the uv/ruff/pytest config and FastAPI service skeleton the avani-python conventions assume. _Works with: `avani-python`._
- `blueprint:monorepo-root` — Stamps the workspace root and apps/packages layout that lets multiple apps in one project share code and contracts. _Works with: `avani-core`._

### invariants

- `invariant:observations_append_only_never_delete` — The provenance guarantee: history is immutable, corrections are additive. Enforced by tests + hooks, taught by avani-field-data. _Works with: `avani-field-data`._
- `invariant:geo_coordinate_fuzzing_public_views` — Protects sensitive locations. Selected by two branches — any geo data, and the protected sensitivity tier — the shared guarantee. _Works with: `avani-field-data`, `avani-postgis`._
- `invariant:a11y_axe_clean` — The enforceable end of the accessibility standard: jsx-a11y lints at write time, axe verifies rendered pages in e2e. Semantics-based, so it holds across component libraries. _Works with: `avani-core`, `avani-nextjs`._
- `invariant:observation_id_uniqueness` — Makes replaying the offline queue idempotent — the property the sync engine depends on to be safe. _Works with: `avani-offline`._
- `invariant:payment_amount_reconciliation` — Guarantees money charged always ties back to authoritative line items — no silent drift. _Works with: `avani-stripe`._
- `invariant:session_expires_event_plus_24hrs` — Bounds stale-credential risk for volunteers in the field by tying session life to the event, not the login. _Works with: `avani-field-data`._

### patterns

- `pattern:nextjs-app-router` — The routing idiom avani-nextjs applies across the app. _Works with: `avani-nextjs`._
- `pattern:react-hook-form-zod` — Forms validate against the same Zod schemas the server uses — one shape, client and server. _Works with: `avani-nextjs`, `avani-typescript`._
- `pattern:zustand-offline-queue` — The client-side write queue the offline sync engine drains when connectivity returns. _Works with: `avani-offline`._
- `pattern:pwa-manifest` — Makes the app installable and usable with no network — the shell offline sync runs inside. _Works with: `avani-offline`._
- `pattern:prisma-postgis` — The ORM wiring that lets geo queries and coordinate fuzzing work through Prisma. _Works with: `avani-postgis`._

## Shared across branches

| Provision | Kind | Selected by |
|---|---|---|
| `invariant:geo_coordinate_fuzzing_public_views` | invariant | `signal:geo`, `sensitivity:protected` |

> Generated from the Zod/TS source by `npm run selection:build`. Do not edit by hand.
