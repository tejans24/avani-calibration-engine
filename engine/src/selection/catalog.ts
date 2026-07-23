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
export const SELECTION_VERSION = '1.0.0';

export type ProvisionKind = 'plugin' | 'blueprint' | 'invariant' | 'pattern';

export interface Provision {
  id: string;
  kind: ProvisionKind;
  description: string;
  /** Tier for plugins: 1 = universal (always), 2 = conditional. */
  tier?: 1 | 2;
}

export interface Condition {
  id: string;
  label: string;
  description: string;
  test: (ctx: SelectionContext) => boolean;
}

export interface Rule {
  condition: string;
  provides: string[];
}

const sensitivityHighPlus = (ctx: SelectionContext): boolean =>
  ctx.dials.sensitivity === 'high' || ctx.dials.sensitivity === 'protected';

/** Every option the engine can select, with a human description. */
export const PROVISIONS: readonly Provision[] = [
  // Plugins
  { id: 'plugin:avani-core', kind: 'plugin', tier: 1, description: 'Universal, language-agnostic standards: security, git workflow, testing discipline, stage detection.' },
  { id: 'plugin:avani-typescript', kind: 'plugin', tier: 2, description: 'TypeScript-strict conventions, Zod-at-the-boundary, service-oriented structure.' },
  { id: 'plugin:avani-python', kind: 'plugin', tier: 2, description: 'uv, ruff, pytest, FastAPI layout, Pydantic-at-the-boundary.' },
  { id: 'plugin:avani-nextjs', kind: 'plugin', tier: 2, description: 'App Router, RHF + Zod forms, Prisma + db-migrations procedure.' },
  { id: 'plugin:avani-postgis', kind: 'plugin', tier: 2, description: 'PostGIS setup and geo queries.' },
  { id: 'plugin:avani-clerk', kind: 'plugin', tier: 2, description: 'Clerk roles, middleware, and invite flows.' },
  { id: 'plugin:avani-stripe', kind: 'plugin', tier: 2, description: 'Stripe payment invariants and webhook handlers.' },
  { id: 'plugin:avani-offline', kind: 'plugin', tier: 2, description: 'Offline sync engine, Zustand queue, PWA manifest.' },
  { id: 'plugin:avani-field-data', kind: 'plugin', tier: 2, description: 'Domain moat: offline-sync, coordinate-fuzzing, append-only invariants.' },
  // Blueprints
  { id: 'blueprint:ts-nextjs-prisma', kind: 'blueprint', description: 'npm db scripts + CI/deploy workflows with prisma migrate deploy as a release step.' },
  { id: 'blueprint:python-fastapi', kind: 'blueprint', description: 'pyproject (uv), ruff + pytest config, service skeleton, CI caller.' },
  { id: 'blueprint:monorepo-root', kind: 'blueprint', description: 'npm-workspaces root, apps/ + packages/shared layout, root CLAUDE.md.' },
  // Invariants
  { id: 'invariant:observations_append_only_never_delete', kind: 'invariant', description: 'Records are never deleted, only superseded with a correction flag.' },
  { id: 'invariant:geo_coordinate_fuzzing_public_views', kind: 'invariant', description: 'Public-facing exports fuzz coordinates; exact coords are admin-only.' },
  { id: 'invariant:observation_id_uniqueness', kind: 'invariant', description: 'Every observation carries a globally unique id (offline-sync idempotency).' },
  { id: 'invariant:payment_amount_reconciliation', kind: 'invariant', description: 'Charged amounts reconcile against source-of-truth line items.' },
  { id: 'invariant:session_expires_event_plus_24hrs', kind: 'invariant', description: 'Field sessions expire 24h after the event they belong to.' },
  // Patterns
  { id: 'pattern:nextjs-app-router', kind: 'pattern', description: 'Next.js App Router routing conventions.' },
  { id: 'pattern:react-hook-form-zod', kind: 'pattern', description: 'React Hook Form wired to shared Zod schemas.' },
  { id: 'pattern:zustand-offline-queue', kind: 'pattern', description: 'Zustand store backing an offline write queue.' },
  { id: 'pattern:pwa-manifest', kind: 'pattern', description: 'PWA manifest + service worker for installable offline use.' },
  { id: 'pattern:prisma-postgis', kind: 'pattern', description: 'Prisma with the PostGIS extension for geo columns.' },
];

/** The branches — predicates over the calibration context. */
export const CONDITIONS: readonly Condition[] = [
  { id: 'always', label: 'Always', description: 'Applies to every project (Tier 1 baseline).', test: () => true },
  { id: 'runtime:ts-nextjs', label: 'runtime = ts-nextjs', description: 'App runs on the TypeScript / Next.js stack.', test: (c) => c.dials.runtime === 'ts-nextjs' },
  { id: 'runtime:python', label: 'runtime = python', description: 'App runs on the Python stack (small APIs, ML, data).', test: (c) => c.dials.runtime === 'python' },
  { id: 'signal:offline', label: 'offline required', description: 'App must function offline.', test: (c) => c.signals.offline_required },
  { id: 'signal:geo', label: 'protected geo', description: 'App stores protected location data.', test: (c) => c.signals.has_protected_geo },
  { id: 'signal:payments', label: 'payments', description: 'App handles payments.', test: (c) => c.signals.has_payments },
  { id: 'signal:auth-clerk', label: 'auth = clerk', description: 'App uses Clerk authentication.', test: (c) => c.signals.auth_clerk },
  { id: 'correctness:append-only', label: 'correctness = append-only', description: 'Data provenance requires append-only records.', test: (c) => c.dials.correctness_bar === 'append-only' },
  { id: 'sensitivity:protected', label: 'sensitivity = protected', description: 'Highest data-sensitivity tier.', test: (c) => c.dials.sensitivity === 'protected' },
  { id: 'topology:monorepo', label: 'topology = monorepo', description: 'Project spans multiple apps.', test: (c) => c.dials.topology === 'monorepo' },
  { id: 'domain:field-data', label: 'field-data domain', description: 'A field-app profile at high+ sensitivity — the domain moat.', test: (c) => c.profile === 'field-app' && sensitivityHighPlus(c) },
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
