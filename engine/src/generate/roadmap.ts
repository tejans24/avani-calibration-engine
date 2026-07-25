/**
 * The execution layer's two stamped files (VISION §13):
 *
 * - ROADMAP.md — durable state: tasks with status, acceptance criteria, and
 *   shape tags. True about the task forever; NO model names.
 * - routing-policy.json — one small file mapping shape tags -> capability tier
 *   -> currently-best model. Model names churn; updating them is one line here.
 */

export function buildRoadmapMd(appName: string): string {
  return `# ${appName} — Roadmap

> Durable execution state. Each task is sized for **one session**: read this file, pick the next
> unblocked task, do it, flip the status, append a one-line handoff note, commit. This file is the
> memory between sessions — CLAUDE.md stays thin.

## Shape tags

- **complexity:** \`mechanical\` (rote, no decisions) · \`standard\` (normal feature work) · \`judgment\` (design decisions involved)
- **risk:** \`low\` · \`medium\` · \`high\` (what breaks if it's wrong)
- **parallelizable:** whether it can run alongside other tasks

Routing (which capability tier executes which shape) lives in \`.avani/routing-policy.json\` — never
name models here.

## Tasks

| # | Task | Status | Complexity | Risk | Acceptance criteria |
|---|---|---|---|---|---|
| 1 | Replace the exemplar \`notes\` domain with the real domain: schema, migration, schemas/, service | todo | judgment | medium | real model in prisma/schema.prisma; migration committed; service + unit + integration tests green |
| 2 | Point \`.env\` / deploy target at real infrastructure | todo | standard | medium | \`npm run db:migrate:deploy\` runs against the real database from CI |
| 3 | Fill in the invariant test stubs in \`tests/invariants/\` | todo | standard | low | every \`test.todo\` replaced with a real assertion at the right tier |
| 4 | Add the second service following the exemplar shape | todo | standard | low | interface + implementation + unit + integration tests, wired in \`src/lib/services.ts\` |
| 5 | First deploy (dev stage) | todo | standard | medium | app reachable; CI ladder green on main |

## Decisions

<!-- append-only; one line per real product/architecture decision: date · decision · why (the constraint or trade-off). This log is harvested by the engine's learning loop — record the WHY, the diff already shows the what. -->

## Handoff notes

<!-- newest first; one line per completed session: date · task # · what changed · anything surprising -->
`;
}

export function buildRoutingPolicy(): Record<string, unknown> {
  return {
    version: 1,
    note: 'Shape tags -> capability tier -> currently-best model. Model names churn; update THIS file only — the roadmap never names models.',
    map: { mechanical: 'fast', standard: 'standard', judgment: 'frontier' },
    tiers: {
      frontier: { model: 'claude-opus-4-8', use: 'judgment tasks: architecture, cross-cutting changes, ambiguous requirements' },
      standard: { model: 'claude-sonnet-5', use: 'standard feature work: a service, a form, a migration' },
      fast: { model: 'claude-haiku-4-5', use: 'mechanical tasks: renames, rote fixes, fleet patch application' },
    },
    workers: {
      default: 'single worker per task; orchestration must justify itself',
      fanOutWhen: 'structural parallelism (independent files/services) or independent-perspective verification',
    },
  };
}
