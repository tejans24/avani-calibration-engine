import type { SelectionContext } from './context.js';

/**
 * The selection map: the versioned rules that turn a calibration context into a
 * set of plugins, blueprints, invariants, and patterns.
 *
 * This is a DAG, not a tree. A provision can be selected by more than one
 * condition (e.g. geo_coordinate_fuzzing is pulled in by both `signal:geo` and
 * `sensitivity:protected`) — that fan-in is what "shared across branches" means.
 * Predicates are code, not a JSON DSL: type-checked, testable, and debuggable.
 */
export const SELECTION_VERSION = '1.1.0';

export type ProvisionKind = 'plugin' | 'blueprint' | 'invariant' | 'pattern';

/** What each kind contributes — the composition model, in tandem. */
export const KIND_ROLES: Record<ProvisionKind, string> = {
  plugin: 'How Claude behaves — skills, hooks, and procedures loaded into the agent. Centrally versioned, referenced not copied.',
  blueprint: 'What gets stamped into the repo — npm scripts, GitHub Actions, config files that plugins cannot add.',
  invariant: 'A guarantee enforced by tests and hooks — a property that must hold no matter what the code does.',
  pattern: 'A concrete stack idiom the plugins apply — the building blocks of the chosen stack.',
};

export const COMPOSITION_SUMMARY =
  'A calibrated project composes four layers in tandem: plugins teach Claude the conventions and procedures; blueprints stamp the operational machinery those procedures drive; invariants pin the guarantees that must hold; patterns are the stack idioms the plugins apply. Each branch selects a coherent slice across all four, so the agent knows the conventions, the repo has the machinery, and the guarantees are enforced together.';

export interface Provision {
  id: string;
  kind: ProvisionKind;
  /** What it is, in a line. */
  description: string;
  /** Why it gets selected and the role it plays in the whole. */
  purpose: string;
  /** Companion provisions it operates with (pairings are symmetrized in the graph). */
  worksWith?: string[];
  /** Tier for plugins: 1 = universal (always), 2 = conditional. */
  tier?: 1 | 2;
}

export interface Condition {
  id: string;
  label: string;
  /** What triggers this branch. */
  description: string;
  /** Why the bundle it selects belongs together. */
  rationale: string;
  test: (ctx: SelectionContext) => boolean;
}

export interface Rule {
  condition: string;
  provides: string[];
}

const sensitivityHighPlus = (ctx: SelectionContext): boolean =>
  ctx.dials.sensitivity === 'high' || ctx.dials.sensitivity === 'protected';

/** Every option the engine can select, with what it is, why, and what it works with. */
export const PROVISIONS: readonly Provision[] = [
  // Plugins
  {
    id: 'plugin:avani-core', kind: 'plugin', tier: 1,
    description: 'Universal, language-agnostic standards: security, git workflow, testing discipline, stage detection.',
    purpose: 'The always-on floor every project stands on before any calibration. Everything else layers on top of it.',
  },
  {
    id: 'plugin:avani-typescript', kind: 'plugin', tier: 2,
    description: 'TypeScript-strict conventions, Zod-at-the-boundary, service-oriented structure.',
    purpose: 'Makes Claude write idiomatic, strict TypeScript with validation at the boundary — applied to every file in a ts-nextjs app.',
    worksWith: ['plugin:avani-nextjs'],
  },
  {
    id: 'plugin:avani-python', kind: 'plugin', tier: 2,
    description: 'uv, ruff, pytest, FastAPI layout, Pydantic-at-the-boundary.',
    purpose: 'Makes Claude write idiomatic Python with FastAPI + Pydantic conventions; the FastAPI OpenAPI spec is the cross-language contract.',
    worksWith: ['blueprint:python-fastapi'],
  },
  {
    id: 'plugin:avani-nextjs', kind: 'plugin', tier: 2,
    description: 'App Router, RHF + Zod forms, Prisma + db-migrations procedure.',
    purpose: 'Teaches the Next.js conventions and the Prisma migration procedure (never db push in prod, migrations append-only). Pairs with the blueprint that stamps the actual commands.',
    worksWith: ['blueprint:ts-nextjs-prisma', 'pattern:nextjs-app-router', 'pattern:react-hook-form-zod'],
  },
  {
    id: 'plugin:avani-postgis', kind: 'plugin', tier: 2,
    description: 'PostGIS setup and geo queries.',
    purpose: 'Teaches PostGIS setup and geo queries, and carries the coordinate-fuzzing guarantee for protected location data.',
    worksWith: ['pattern:prisma-postgis', 'invariant:geo_coordinate_fuzzing_public_views'],
  },
  {
    id: 'plugin:avani-clerk', kind: 'plugin', tier: 2,
    description: 'Clerk roles, middleware, and invite flows.',
    purpose: 'Wires Clerk authentication: role-based access, route middleware, and invite-only onboarding.',
  },
  {
    id: 'plugin:avani-stripe', kind: 'plugin', tier: 2,
    description: 'Stripe payment invariants and webhook handlers.',
    purpose: 'Payment handling with reconciliation guarantees and the webhook-verification procedure.',
    worksWith: ['invariant:payment_amount_reconciliation'],
  },
  {
    id: 'plugin:avani-offline', kind: 'plugin', tier: 2,
    description: 'Offline sync engine, Zustand queue, PWA manifest.',
    purpose: 'The offline capability: the sync engine plus the idempotency guarantee that replaying the write queue is always safe.',
    worksWith: ['pattern:zustand-offline-queue', 'pattern:pwa-manifest', 'invariant:observation_id_uniqueness'],
  },
  {
    id: 'plugin:avani-field-data', kind: 'plugin', tier: 2,
    description: 'Domain moat: offline-sync, coordinate-fuzzing, append-only invariants.',
    purpose: 'The domain moat for field apps — the append-only provenance, coordinate fuzzing, and session rules that make protected field data trustworthy.',
    worksWith: [
      'invariant:observations_append_only_never_delete',
      'invariant:geo_coordinate_fuzzing_public_views',
      'invariant:session_expires_event_plus_24hrs',
    ],
  },
  // Blueprints
  {
    id: 'blueprint:ts-nextjs-prisma', kind: 'blueprint',
    description: 'npm db scripts + CI/deploy workflows with prisma migrate deploy as a release step.',
    purpose: 'Stamps the db commands and CI/deploy machinery that the avani-nextjs migration procedure operates on. The blueprint gives every project identical commands; the plugin makes Claude use them the same way.',
    worksWith: ['plugin:avani-nextjs'],
  },
  {
    id: 'blueprint:python-fastapi', kind: 'blueprint',
    description: 'pyproject (uv), ruff + pytest config, service skeleton, CI caller.',
    purpose: 'Stamps the uv/ruff/pytest config and FastAPI service skeleton the avani-python conventions assume.',
    worksWith: ['plugin:avani-python'],
  },
  {
    id: 'blueprint:monorepo-root', kind: 'blueprint',
    description: 'npm-workspaces root, apps/ + packages/shared layout, root CLAUDE.md.',
    purpose: 'Stamps the workspace root and apps/packages layout that lets multiple apps in one project share code and contracts.',
    worksWith: ['plugin:avani-core'],
  },
  // Invariants
  {
    id: 'invariant:observations_append_only_never_delete', kind: 'invariant',
    description: 'Records are never deleted, only superseded with a correction flag.',
    purpose: 'The provenance guarantee: history is immutable, corrections are additive. Enforced by tests + hooks, taught by avani-field-data.',
    worksWith: ['plugin:avani-field-data'],
  },
  {
    id: 'invariant:geo_coordinate_fuzzing_public_views', kind: 'invariant',
    description: 'Public-facing exports fuzz coordinates; exact coords are admin-only.',
    purpose: 'Protects sensitive locations. Selected by two branches — any geo data, and the protected sensitivity tier — the shared guarantee.',
    worksWith: ['plugin:avani-postgis', 'plugin:avani-field-data'],
  },
  {
    id: 'invariant:observation_id_uniqueness', kind: 'invariant',
    description: 'Every observation carries a globally unique id (offline-sync idempotency).',
    purpose: 'Makes replaying the offline queue idempotent — the property the sync engine depends on to be safe.',
    worksWith: ['plugin:avani-offline'],
  },
  {
    id: 'invariant:payment_amount_reconciliation', kind: 'invariant',
    description: 'Charged amounts reconcile against source-of-truth line items.',
    purpose: 'Guarantees money charged always ties back to authoritative line items — no silent drift.',
    worksWith: ['plugin:avani-stripe'],
  },
  {
    id: 'invariant:session_expires_event_plus_24hrs', kind: 'invariant',
    description: 'Field sessions expire 24h after the event they belong to.',
    purpose: 'Bounds stale-credential risk for volunteers in the field by tying session life to the event, not the login.',
    worksWith: ['plugin:avani-field-data'],
  },
  // Patterns
  {
    id: 'pattern:nextjs-app-router', kind: 'pattern',
    description: 'Next.js App Router routing conventions.',
    purpose: 'The routing idiom avani-nextjs applies across the app.',
    worksWith: ['plugin:avani-nextjs'],
  },
  {
    id: 'pattern:react-hook-form-zod', kind: 'pattern',
    description: 'React Hook Form wired to shared Zod schemas.',
    purpose: 'Forms validate against the same Zod schemas the server uses — one shape, client and server.',
    worksWith: ['plugin:avani-nextjs', 'plugin:avani-typescript'],
  },
  {
    id: 'pattern:zustand-offline-queue', kind: 'pattern',
    description: 'Zustand store backing an offline write queue.',
    purpose: 'The client-side write queue the offline sync engine drains when connectivity returns.',
    worksWith: ['plugin:avani-offline'],
  },
  {
    id: 'pattern:pwa-manifest', kind: 'pattern',
    description: 'PWA manifest + service worker for installable offline use.',
    purpose: 'Makes the app installable and usable with no network — the shell offline sync runs inside.',
    worksWith: ['plugin:avani-offline'],
  },
  {
    id: 'pattern:prisma-postgis', kind: 'pattern',
    description: 'Prisma with the PostGIS extension for geo columns.',
    purpose: 'The ORM wiring that lets geo queries and coordinate fuzzing work through Prisma.',
    worksWith: ['plugin:avani-postgis'],
  },
];

/** The branches — predicates over the calibration context, with why each bundle belongs together. */
export const CONDITIONS: readonly Condition[] = [
  { id: 'always', label: 'Always', description: 'Applies to every project (Tier 1 baseline).', rationale: 'The floor every project stands on before any calibration — safe and consistent by default.', test: () => true },
  { id: 'runtime:ts-nextjs', label: 'runtime = ts-nextjs', description: 'App runs on the TypeScript / Next.js stack.', rationale: 'Selects the TS conventions, the Next.js behavior + Prisma procedure, the stamped db/CI machinery, and the stack idioms — so the agent knows the stack and the repo has the commands, together.', test: (c) => c.dials.runtime === 'ts-nextjs' },
  { id: 'runtime:python', label: 'runtime = python', description: 'App runs on the Python stack (small APIs, ML, data).', rationale: 'Python conventions plus the FastAPI/uv skeleton, so the service is idiomatic and immediately runnable.', test: (c) => c.dials.runtime === 'python' },
  { id: 'signal:offline', label: 'offline required', description: 'App must function offline.', rationale: 'Offline needs three pieces in tandem: the sync engine (plugin), the queue + installable shell (patterns), and the idempotency guarantee (invariant). None works alone.', test: (c) => c.signals.offline_required },
  { id: 'signal:geo', label: 'protected geo', description: 'App stores protected location data.', rationale: 'Geo data pulls in PostGIS setup, the Prisma-PostGIS pattern, and the coordinate-fuzzing guarantee.', test: (c) => c.signals.has_protected_geo },
  { id: 'signal:payments', label: 'payments', description: 'App handles payments.', rationale: 'Payments pull in the Stripe behavior and the reconciliation guarantee that keeps charges honest.', test: (c) => c.signals.has_payments },
  { id: 'signal:auth-clerk', label: 'auth = clerk', description: 'App uses Clerk authentication.', rationale: 'Adds Clerk role-based access, middleware, and invite flows.', test: (c) => c.signals.auth_clerk },
  { id: 'correctness:append-only', label: 'correctness = append-only', description: 'Data provenance requires append-only records.', rationale: 'Turns on the append-only provenance guarantee — history becomes immutable.', test: (c) => c.dials.correctness_bar === 'append-only' },
  { id: 'sensitivity:protected', label: 'sensitivity = protected', description: 'Highest data-sensitivity tier.', rationale: 'The top tier adds the coordinate-fuzzing guarantee on top of whatever geo handling is present — which is why that invariant is shared.', test: (c) => c.dials.sensitivity === 'protected' },
  { id: 'topology:monorepo', label: 'topology = monorepo', description: 'Project spans multiple apps.', rationale: 'Stamps the workspace root so multiple apps share code and a generated cross-language client.', test: (c) => c.dials.topology === 'monorepo' },
  { id: 'domain:field-data', label: 'field-data domain', description: 'A field-app profile at high+ sensitivity.', rationale: 'The moat bundle: the field-data plugin and its session guarantee — reserved for field apps at high or protected sensitivity.', test: (c) => c.profile === 'field-app' && sensitivityHighPlus(c) },
];

/** Edges: condition -> provisions it turns on. Shared provisions appear under multiple rules. */
export const RULES: readonly Rule[] = [
  { condition: 'always', provides: ['plugin:avani-core'] },
  {
    condition: 'runtime:ts-nextjs',
    provides: [
      'plugin:avani-typescript',
      'plugin:avani-nextjs',
      'blueprint:ts-nextjs-prisma',
      'pattern:nextjs-app-router',
      'pattern:react-hook-form-zod',
    ],
  },
  { condition: 'runtime:python', provides: ['plugin:avani-python', 'blueprint:python-fastapi'] },
  {
    condition: 'signal:offline',
    provides: ['plugin:avani-offline', 'pattern:zustand-offline-queue', 'pattern:pwa-manifest', 'invariant:observation_id_uniqueness'],
  },
  { condition: 'signal:geo', provides: ['plugin:avani-postgis', 'pattern:prisma-postgis', 'invariant:geo_coordinate_fuzzing_public_views'] },
  { condition: 'signal:payments', provides: ['plugin:avani-stripe', 'invariant:payment_amount_reconciliation'] },
  { condition: 'signal:auth-clerk', provides: ['plugin:avani-clerk'] },
  { condition: 'correctness:append-only', provides: ['invariant:observations_append_only_never_delete'] },
  { condition: 'sensitivity:protected', provides: ['invariant:geo_coordinate_fuzzing_public_views'] },
  { condition: 'topology:monorepo', provides: ['blueprint:monorepo-root'] },
  { condition: 'domain:field-data', provides: ['plugin:avani-field-data', 'invariant:session_expires_event_plus_24hrs'] },
];

export const PROVISION_BY_ID: ReadonlyMap<string, Provision> = new Map(PROVISIONS.map((p) => [p.id, p]));
export const CONDITION_BY_ID: ReadonlyMap<string, Condition> = new Map(CONDITIONS.map((c) => [c.id, c]));
