import { REVIEWED_ON, TIERS, TIER_NAMES, WORK_ROUTES } from '../routing/model-map.js';

/**
 * The execution layer's two stamped files (VISION §13):
 *
 * - ROADMAP.md — durable state: tasks with status, acceptance criteria, and
 *   shape tags. True about the task forever; NO model names.
 * - routing-policy.json — kind of work -> capability tier -> model family alias,
 *   built from the engine's model map (engine/src/routing/model-map.ts).
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
    version: 2,
    note:
      'Kind of work -> capability tier -> model family alias. Claude Code resolves an alias (opus | sonnet | haiku) to the newest model in that family, so new releases need no edit here. `resolvedTo` is what each alias meant on `reviewedOn` — informational, never routed on.',
    reviewedOn: REVIEWED_ON,
    routes: WORK_ROUTES,
    tiers: Object.fromEntries(
      TIER_NAMES.map((tier) => [tier, { model: TIERS[tier].alias, resolvedTo: TIERS[tier].current, use: TIERS[tier].use }]),
    ),
    workers: {
      default: 'single worker per task; orchestration must justify itself',
      fanOutWhen: 'structural parallelism (independent files/services) or independent-perspective verification',
    },
  };
}
