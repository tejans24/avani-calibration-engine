# Next — idea → product, with the checks in place

The flow exists end to end: idea → intake → calibrate (the engine proposes the dials and the deploy target, with every option explained) → the owner decides → stamp (runnable skeleton, CI ladder, invariant stubs, stage guards, roadmap, routing policy, bounded agents, and — for `railway` — the deploy pipeline) → sessions work the roadmap under those bounds → CI deploys under the production gate.

What still costs hand work, in the order that shortens idea-to-product most per unit of work. Each item is sized for one focused session.

| # | Item | Why it is next | Lives in |
|---|---|---|---|
| 1 | **Intake interview** — `new --interview` / `calibrate init` asks the intake fields plus the five deploy-target inputs the rules cannot see yet (`existing_cloud`, compliance/residency/private networking, `scale_horizon`, realtime/background jobs, on-premises), writes `.avani/intake-profile.json`, prints the menu, records the owner's decision | Idea capture is hand-written JSON today, and rules 1, 2, 5 and half of 3 can never fire | `engine/src/schema/intake-profile.ts`, `engine/src/calibration/infra.ts` (`UNANSWERED_INPUTS`), `engine/bin/calibrate.ts` |
| 2 | **Roadmap derived from entities** — an optional `entities` list in the intake expands into one session-sized task per slice (schema + migration → service + tests → page/form), in dependency order, tagged for routing, orchestrator owning every schema task | Task 1 of the stamped roadmap ("replace the exemplar domain") is the whole product hiding in one row | `engine/src/generate/roadmap.ts`, exemplar slice in `templates/ts-nextjs-prisma/files/` |
| 3 | **Checks that bite past staging** — a `test.todo` invariant fails at `AVANI_STAGE` ≥ staging; a CI job classifies every schema-touching PR (`additive` / `data-shape` / `destructive`, VISION §14) and blocks `destructive` without the contract-phase label; the Stop hook runs the ladder CI runs | Stubs pass silently forever, schema changes are unclassified, and the hook checks less than CI | `engine/src/generate/invariant-tests.ts`, `engine/src/generate/settings.ts`, blueprint `ci.yml` |
| 4 | **One real idea through the whole flow** — stamp a small app with `--infra railway`, work its roadmap with the stamped agents, deploy to staging, promote through the production gate, restore a backup once; log every hand step and where it belongs | Nothing else validates the path (VISION §20: the MVP is done when reality corrects it) | a new project repo; the log comes back here |

Deliberately not next: the constraint graph and decision tiers (VISION phases D, E) and the `avani-actions` reusable-workflow repo. Item 4 will show which parts of them are actually needed.

Deploy profiles other than `railway` (SPEC §4.2) are house positions until a project runs on one; stamping `vercel` is the first of those, pulled by the first project that decides it.
