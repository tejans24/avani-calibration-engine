# Avani Calibration Engine — Technical Specification

**Version:** 0.5.0
**Status:** DRAFT (approved direction; engine implementation not started)
**Last Updated:** 22 Jul 2026

---

## 1. Outcome

The engine takes an **application spec** (raw idea + intake Q&A) and produces a repo where any Claude Code session that opens it is already an expert — in universal engineering standards *and* in that app's specific domain constraints — with enforcement that **escalates on its own as the app matures** (§3).

It emits:

| Artifact | Purpose |
|---|---|
| `.claude/settings.json` | Declares the Avani marketplace + **selected** plugins (`extraKnownMarketplaces`, `enabledPlugins`), permissions, stage- and sensitivity-scaled hooks |
| `CLAUDE.md` | Thin project-specific layer: architecture, commands, gotchas, the stage convention (< 200 lines); per-app copies in monorepos |
| **Blueprint files** | Stamped operational machinery: npm db/migration scripts, GitHub Actions (thin callers of centralized reusable workflows), workspace layout (§4) |
| `tests/invariants/*.test.ts` | Executable guarantees derived from calibration (append-only, uniqueness, fuzzing) |
| `.mcp.json` | MCP servers matching the selected stack |

**Core principle: knowledge is selected, not generated.** It lives in centrally versioned forms, all selected by the same calibration dials:

- **Plugins** — how Claude *behaves* (skills, hooks, procedures)
- **Blueprints** — what gets *stamped into the repo* (scripts, workflows, config files)
- **Reusable workflows** (`avani-actions`) — centralized CI/CD behavior the stamped workflows call into (§5)

The engine's job is calibration → selection, plus generating the small project-specific residue.

### Why plugins

- **Central versioning solves drift.** Improve a plugin once; the marketplace catalog pins releases (commit SHA), so existing projects stay reproducible while new projects get the latest.
- **Namespacing.** Plugin skills are invoked as `avani-core:security-scan` — no collisions.
- **Handoff/licensing falls out for free.** Projects *reference* the marketplace, never vendoring skill source. Access to the marketplace is the license (§6).

---

## 2. Two-Tier Knowledge Model

### Dials (set at calibration)

| Dial | Values | Notes |
|---|---|---|
| `correctness_bar` | basic · standard · strict · append-only | |
| `sensitivity` | low · medium · high · protected | how careful to be with the **data** — intrinsic to the domain, roughly fixed |
| `infra` | vercel · railway · aws · gcp · self-hosted | Chosen by the decision rules in §4.1; realized by a deploy profile (§4.2) |
| `runtime` | ts-nextjs · python | **per-app.** `ts-nextjs` is the default for product/UI apps (easiest build/deploy); `python` for small backend APIs, ML workflows, data pipelines |
| `topology` | single-app · monorepo | monorepo when the project spans multiple apps (§4) |

> **`stage` is a separate, mutable dimension — not a calibration dial.** It changes over the project's life and is resolved on the ground, not baked in. See §3.

### 2.1 Durability rule — name the tool, not the release

Plugins propagate centrally (§5) to projects running *different* stack versions. So a release-specific claim inside a plugin is not merely stale — it is **wrong for every project on a different version**. Telling a Next 16 project to edit `src/middleware.ts` (renamed in 16) is an active defect, not aging documentation.

The split is between decisions and facts:

| | Stability | Where it lives |
|---|---|---|
| **Tool choice** — "we use Prisma", "forms are RHF + Zod" | Stable; dial-selected | Named freely in skills. Concrete beats vague. |
| **Release behavior** — "Prisma 7's reset no longer seeds", "renamed in Next 16" | Expires | **Not in a plugin.** Absorb into a script/gate, or quarantine under `## Stack notes (current pins)`. |

Three tests for any line of skill content:

1. **Version test** — would this be false after the next major? Then it isn't judgment, it's mechanism.
2. **Tier test** — does it require one framework to parse? Tier 1 must hold for React, Svelte, Vue, and server-rendered stacks, naming frameworks only as examples. Tier 2 may be fully library-specific.
3. **Command test** — could this be a named script instead of a description? Then make it one.

**The command surface is the version-absorbing layer** (principle 2 applied to tooling): a skill teaches `npm run db:migrate:deploy`; the blueprint decides whether that is Prisma 6, Prisma 7, or something else, frozen per repo alongside that project's pins. An ORM upgrade then edits scripts, not skills.

Enforced by a test (`engine/tests/smoke.test.ts`): a tool name followed by a version number in a plugin skill fails CI unless it sits under `## Stack notes (current pins)`. The gate is a floor, not a ceiling — version facts without numbers ("the new caching directive") still need judgment at review.

### Tier 1 — Universal (always enabled)

`avani-core`: **language-agnostic** standards — security scanning, git workflow, testing discipline, multi-agent orchestration discipline, secrets-blocking hooks, **stage detection** (§3). Enabled in every generated project, and installable in any existing project. Its content must read correctly in a Python or server-rendered project, not only a React one (§2.1, tier test).

### Tier 2 — Conditional (selected by application spec context)

**Language plugins** (a mixed project enables both; each skill's `description` scopes it to its own language):

| Plugin | Contents | Selected when |
|---|---|---|
| `avani-typescript` | TS-strict conventions, naming, Zod-at-the-boundary, service-oriented structure | any app with `runtime = ts-nextjs` |
| `avani-python` | uv, ruff, pytest, FastAPI service layout, Pydantic-at-the-boundary | any app with `runtime = python` |

**Stack & domain plugins:**

| Plugin | Contents | Selected when |
|---|---|---|
| `avani-nextjs` | App Router, RHF + Zod forms, client-state tiering, **Prisma + db-migrations procedure** | `runtime = ts-nextjs` |
| `avani-postgis` | PostGIS setup, geo queries | geo data in profile |
| `avani-clerk` | Roles, middleware, invite flows | `auth_model = clerk-*` |
| `avani-stripe` | Payment invariants, webhook handlers | money transactions |
| `avani-offline` | Sync engine, Zustand queue, PWA manifest | `offline_required = true` |
| `avani-field-data` | offline-sync, coordinate-fuzzing, append-only invariants (domain moat) | `sensitivity ≥ high` + field-data profile |

---

## 3. Stage — Escalating Enforcement on the Ground

`sensitivity` = how careful to be with the *data* (fixed by domain). **`stage`** = how much ceremony the *process* demands *right now* (grows as the app matures: `dev → staging → production`). Orthogonal axes: a high-sensitivity app in early dev shouldn't carry prod-migration ceremony; a plain site in prod still needs deploy discipline.

Because stage is **mutable**, it is never baked into generated files. It is resolved from the ground, so the right rules load only when the relevant action happens — Claude is not flooded with prod procedures while writing a component on a feature branch.

### The `AVANI_STAGE` convention

A minimal, recognizable contract every project encodes identically, with a fallback chain:

1. **`AVANI_STAGE` env var** — explicit signal (`dev` | `staging` | `production`), defaults to `dev`. CI sets it per environment.
2. **Branch mapping** (fallback) — `feature/*` → dev, `main` → staging, tagged release / prod deploy job → production. An `avani-core` hook resolves it via `git rev-parse --abbrev-ref HEAD`.
3. **Recorded in `CLAUDE.md`** and taught by an `avani-core` skill, so Claude reads the convention instead of guessing.

### Escalating enforcement

Stage layers on top of sensitivity to decide which hooks are active and which procedures apply:

| Stage | Enforcement |
|---|---|
| dev | minimal — secrets block, typecheck |
| staging | + lint/test gates, migration guards |
| production | + append-only enforcement, prod-migration ceremony, deploy verifications, audit logging |

**Delivery is "on the ground" by construction:** hooks fire on the triggering action (a deploy command → the prod checklist is injected then), and skills surface by description (the prod-migration procedure loads only when the task matches). The strongest signal is real: prod ceremony fires because you are on a prod deploy path, not because a stale field says so.

### Stage-gated blueprint stamping

Promotion is not a regeneration. `calibrate` at dev stamps only CI; promoting stamps the next tier (staging, then prod deploy workflows). The project's accumulated state survives — this stays compatible with one-shot generation.

---

## 4. Blueprints & Multi-App Topology

Plugins cannot add files to a project (no `package.json` scripts, no `.github/workflows/`). That machinery is the blueprint layer: **deterministic file templates in `templates/<blueprint>/`, stamped by `generate`, selected by the same dials.**

| Blueprint | Selected when | Stamps |
|---|---|---|
| `ts-nextjs-prisma` | `runtime = ts-nextjs` | npm scripts (`db:migrate:dev`, `db:migrate:deploy`, `db:reset`, `db:seed`, `db:studio`); thin `ci.yml` / `deploy.yml` that **call reusable workflows** (§5) with `prisma migrate deploy` as the prod release step |
| `python-fastapi` | `runtime = python` | `pyproject.toml` (uv), ruff + pytest config, service skeleton, CI caller |
| `monorepo-root` | `topology = monorepo` | npm-workspaces root, `apps/` + `packages/shared` layout, root CLAUDE.md skeleton |

**Blueprint/skill pairing.** Every blueprint with a procedure has a paired plugin skill (e.g. `ts-nextjs-prisma` ↔ `avani-nextjs:db-migrations`): the blueprint gives every project identical commands; the skill makes Claude follow identical procedure — never `db push` in prod, migrations append-only, reset is dev-only.

### Multi-app topology

One monorepo **per client project**:

```
client-project/
├── apps/web/            Next.js (runtime: ts-nextjs)
├── apps/ml-api/         FastAPI (runtime: python, uv)
├── packages/shared/     shared Zod schemas / generated API client
├── package.json         npm workspaces root
├── CLAUDE.md            root: topology, cross-app contracts, stage convention
└── apps/*/CLAUDE.md     per-app residue
```

npm workspaces on the TS side, uv per Python app (Turborepo only if build times later demand it). Cross-language contract: FastAPI's OpenAPI spec → generated TS client in `packages/shared`. The engine handles this by composition: calibrate once per project, a `runtime` dial per app, plugin selection is the union, blueprints stamp per-app.

### 4.1 Deploy target — the decision rules

The `infra` dial is a **decision a human makes, suggested by the system** (the Propose tier, VISION §6). At calibration the engine applies the rules below (first match wins) and emits a *proposal*: the rule that fired and the inputs it read, the runner-up it is declining, and every input it could not consider. The owner then **accepts or overrides** — `calibrate --infra <target> --why "<reason>"` — and the config records both sides (`decisions.infra`: proposed / rule / rationale / runner-up / unanswered, and decided / decided-by / note). Only `owner` is admissible as the decider; the schema rejects anything else. The record travels into `.avani/manifest.json` and seeds the roadmap's decision log, so any later session can read who decided and why without re-running calibration.

A config whose target is still `proposed` is complete for everything except deployment: nothing deploys on a proposal. In self mode (`avani new`) the owner running the command *is* the decision, and the house preset is their standing answer — recorded as decided, with the proposal and the unanswered inputs alongside so it can be re-decided the moment one applies. Re-deciding later is a decision-log entry, never a per-session choice.

Inputs marked *(intake: add)* are not in the intake profile yet — they arrive with the dial expansion (VISION §20 phase C). Until then the rules that need them cannot fire, the proposal says so explicitly, and the owner weighs them by hand before accepting.

| # | If | Then | Why |
|---|---|---|---|
| 1 | The client already runs a cloud with procurement, IAM and networking in place *(intake: `existing_cloud`)* | **That cloud** — `aws` (CDK) or `gcp` (Terraform) | Never fight procurement; the client's ops team must be able to inherit it. |
| 2 | A compliance regime, data-residency requirement, private networking, or a 100× scale horizon *(intake: `compliance_regime`, `data_residency`, `private_networking`, `scale_horizon`)* | **`aws`** with CDK. `gcp` only under rule 1 or for a GCP-native workload (BigQuery, Vertex, Document AI). | Hyperscaler controls exist for these; PaaS targets don't. AWS is the house default because CDK is the codify-everything path (VISION §7). |
| 3 | The app needs a **long-lived process**: websockets/realtime, background workers, cron, in-process queues, a persistent server runtime (Express/tRPC) *(intake: `needs_realtime`, `needs_background_jobs`)* — **or** `runtime = python` — **or** a tight budget that needs flat, predictable cost | **`railway`** | A container with an attached Postgres, flat pricing, near-zero ops. This is the shipped mi-casa shape. |
| 4 | `runtime = ts-nextjs`, request/response only, `ops_capacity` low or medium, scale horizon flat-to-10× | **`vercel`** — the default | Lowest ops for a Next.js product app; the sanctioned split is app on Vercel + managed Postgres with branching. |
| 5 | Data may not leave client premises, or a contractual hosting requirement *(intake: `on_premises_required`)* | **`self-hosted`** — requires `ops_capacity = high` | Only ever a requirement, never a cost play; someone has to run it. |

**Tie-breakers and anti-rules.**

- Among admissible targets the cheapest to *operate* wins: vercel / railway before aws / gcp before self-hosted. Hosting cost is a TCO input (VISION §8), ops burden is the larger term.
- Do not buy scale you don't have. A 10× horizon penalizes Vercel's pricing cliffs but does **not** justify AWS on its own — AWS costs a human sooner (VISION §7). Railway is the middle step.
- One provider for app and database, except the Vercel + managed-Postgres split above. Two vendors for one app is two incident channels.
- Re-decide only at a stage promotion (§3) or a decision-log entry, and always by the owner. A session never changes the target on its own — the target picks the deploy profile, and the profile picks the stamped machinery.

### 4.2 Deploy profiles — what a target commits you to

Each target has one profile. The profile is the contract the blueprint stamps against and the `deployment` skill (avani-core) teaches from; every row is a decision the project must not re-make per session. Rows marked **shipped** are harvested from a running system; the others are the house position until a project verifies them.

| | `vercel` | `railway` **(shipped: mi-casa)** | `aws` | `gcp` | `self-hosted` |
|---|---|---|---|---|---|
| **Runtime shape** | Serverless functions; the request proxy on the edge | One long-lived container per service, built from the repo | ECS Fargate service behind an ALB (Lambda only for API-only python) | Cloud Run service | Compose on a VM (Kubernetes only if the client already runs it) |
| **Database** | Managed Postgres with branch-per-preview | Platform Postgres on a persistent volume | RDS Postgres, private subnet | Cloud SQL Postgres, private IP | Postgres on the host, own volume |
| **Migrations run** | CI job before the deploy; git auto-deploy **off** for production, deploy via CLI from CI | `preDeployCommand` = `db:migrate:deploy` — atomic with the release: a failed migration aborts the deploy and the old container keeps serving | One-off task from the same image, run by the pipeline before the service update | Cloud Run job before the service revision | Deploy script step, before the app restarts |
| **Health** | `/api/health` route, checked post-deploy | `healthcheckPath = /api/health`, restart on failure | ALB target-group check on `/api/health` | Startup probe on `/api/health` | Reverse-proxy check on `/api/health` |
| **Secrets** | GitHub Secrets are the source of truth; synced to the platform by the deploy workflow | Same: `deploy.yml` syncs GitHub Secrets → platform variables, then deploys | Secrets Manager + SSM; CI assumes a role via GitHub OIDC — no long-lived keys | Secret Manager; CI via Workload Identity Federation | Env file provisioned from the client's secret store; never in the repo |
| **Backups** | Provider point-in-time recovery + nightly off-platform dump | Volume backups + nightly encrypted off-platform dump **with a restore verification step** | Automated RDS backups + a snapshot before every data-shape migration | Automated Cloud SQL backups + on-demand before data-shape migrations | Nightly `pg_dump` offsite + a scheduled restore drill |
| **Preview / staging** | Per-PR preview with a DB branch | A `staging` environment, deployed on demand (`workflow_dispatch` with an environment input); per-PR environments optional | A staging stack in its own account or environment; no per-PR previews by default | A staging project; no per-PR previews by default | Staging VM if the client funds it |
| **Infrastructure as code** | Provider config as code where it exists; nothing to apply | `railway.toml` (config-as-code) | **CDK, always** (VISION §7). `cdk diff` posted on the PR; `cdk deploy` per environment from CI | Terraform. `plan` on the PR; `apply` per environment from CI | Compose files + a provisioning script |
| **Production gate** | GitHub Environment `production` with a required reviewer + migration classification (VISION §14) | Same | Same, plus the `cdk diff` in the review | Same, plus the `plan` in the review | Runbook + human |

The profile answers, per target, the questions a project otherwise answers by hand on launch day: where migrations run, how a secret reaches the platform, what "deployed" means, and who may press the button. `deploy.yml`, the health route, the env manifest and the backup job are the blueprint files a profile stamps (phase 3 in §12); the procedure around them is the `deployment` skill.

### 4.3 The pipeline ladder, by stage

The same stamped pipeline, armed progressively by stage (§3). Fail cheap first.

| Stage | Trigger | Runs | Deploys |
|---|---|---|---|
| **dev** | every PR | checks (typecheck, lint, unit) → integration (real Postgres, migrated from empty) | preview environment if the profile has one; otherwise nothing |
| **staging** | merge to `main` | + e2e (built app, axe invariants) | migrate → deploy to staging → health → smoke |
| **production** | release tag or manual dispatch | + migration classification (additive auto-applies; data-shape needs the expand/contract procedure; destructive only as the contract tail), backup before any data-shape change, **human gate** | migrate → deploy → health → e2e smoke against production |

Rollback is **forward-only**: redeploy the previous application artifact; never run a down-migration (VISION §14). Until `avani-actions` exists (§5, §13) the workflows are inline in the blueprint — the layering claim in §5 is aspirational for CI/CD today, and this table is the honest current state.

### 4.4 Task bounds — who does what

When a project comes in, the work is already divided. Every role has files it owns, files it never touches, a verification bar, and an escalation rule; the dispatch prompt (avani-core `orchestration`) restates them per task. Roles map to routing tiers through the shape tags in `.avani/routing-policy.json`, never to model names, and the stamped `.claude/agents/` definitions carry the same bounds into every project.

| Role | Tier | Owns | Never touches | Verifies with | Escalates when |
|---|---|---|---|---|---|
| **Orchestrator** (the owner's session) | judgment | The `infra` decision, the schema and migrations, dependencies and the lockfile, git, secrets *configuration*, stage promotion, wave planning | — | Re-runs every worker's verification on the quiet tree before committing | Anything that changes cost, removes visible functionality, or touches the production gate goes to the human |
| **feature-worker** | standard | The service, page, or test files named in its dispatch | Schema, migrations, `package.json` / lockfile, workflows, `infra/`, `.env*`, deploy config; never commits, pushes, installs, or deploys | typecheck, lint, unit for touched files; integration when a service changed | It needs a schema change, a new dependency, or a shared file |
| **infra-worker** | judgment for target design and IaC; standard for wiring | `deploy*.yml`, `infra/`, the deploy config file, `.env.example` keys, the backup job | Application code, secret *values*; **never runs a deploy or applies IaC to any environment** — CI does that under the gate | Workflow lint, `cdk diff` / `terraform plan` attached to the report, the stamped ladder green | A new resource that holds data, a cost change, anything touching the production gate |
| **verifier** | standard | Nothing — read and run only | Any edit | Re-runs the verification bar, drives the built app, reads the screenshots, reports pass/fail with counts | A pass it cannot reproduce |

Two rules hold across every role: **production is never agent-executed** — agents prepare changes, CI deploys them under the human gate; and **an agent's green is not green** until the orchestrator has re-run it (§ orchestration).

---

## 5. Propagation Model

The recurring question — *"if I improve something here, do existing repos get it?"* — is answered by which layer the change lives in. That dependency is a design lever:

| Layer | Propagation | Put here |
|---|---|---|
| **Plugin** (skills, hooks) | **Updatable centrally** — a live marketplace reference; bump the pin and repos pull the new behavior | Stage detection, procedures, escalating checks |
| **Reusable workflow** (`avani-actions`) | **Updatable centrally** — repos pin `@v1`; fix once, all callers get it | Heavy CI/CD logic (deploy, migrate-on-release, verifications) |
| **Blueprint** (stamped files) | **Frozen per repo** — the copy is the repo's; template changes help only *new* projects | Inert scaffold (file skeletons that carry no behavior) |

> **Rule of thumb: volatile behavior → plugins & reusable workflows (propagates). Inert scaffold → blueprints (frozen, which is correct — a repo's skeleton shouldn't mutate under it).** For the rare need to re-stamp scaffold across repos, `calibrate sync` diffs the current template against the repo and asks for approval.

Consequence: almost nothing that *matters* is frozen. Stage logic, procedures, and the deploy pipeline all live in updatable layers; only the skeleton — the part you want stable — is frozen.

---

## 6. Handoff & Licensing

Projects **reference** the marketplace (`.claude/settings.json`), never vendoring skill source. So the deliverable's git tree carries a pointer, not your IP.

- **Blueprints and the app are the client's** — real files, their deliverable, fungible scaffold.
- **Plugins are a pointer.** With marketplace access they resolve; without it they're inert but the app still builds and runs (blueprints are real files).

**Access to the marketplace is the license.** No separate licensing system to build.

**Default handoff mode: reference stays, gated by access.** Generated projects keep the plugin references live — a client with access gets full AI-assist; without access, references are inert. `calibrate handoff --strip` produces a clean code-only variant when a pure deliverable is wanted.

Access matrix:

| Recipient | Gets |
|---|---|
| You + operators | full marketplace |
| Handoff-only client | clean code (`--strip`); no references |
| Licensing client | public + client-safe tiers; moat tier only if paid for |

**Honest boundary:** "reference not copy" prevents *incidental* leakage (handing over a repo doesn't leak the moat, and a client without access gets nothing). It does not hide content from someone you've *granted* access to — once installed, a plugin's SKILL.md is readable on their machine. The boundary is who gets access; keep crown-jewel domain logic in a sparingly granted tier.

> **TODO (deferred): marketplace tiering.** How to physically separate public / client-safe / moat plugins (separate repos vs. one access-controlled marketplace vs. two tiers) is not yet decided. See §13.

---

## 7. Repo Structure (single repo = engine + marketplace)

```
avani-calibration-engine/
├── .claude-plugin/marketplace.json   # this repo IS the marketplace
├── plugins/
│   ├── avani-core/                    # Tier 1 (language-agnostic; stage detection)
│   ├── avani-typescript/ avani-python/# Tier 2 language
│   ├── avani-nextjs/ avani-postgis/ avani-clerk/ avani-stripe/ avani-offline/
│   └── avani-field-data/              # Tier 2 domain (moat)
├── templates/                         # blueprints (§4)
├── engine/
│   ├── bin/calibrate.ts
│   ├── src/{intake,profiles,select,generate}/
│   └── tests/
├── schemas/                           # JSON Schema contracts
├── examples/                          # golden fixtures from shipped apps
└── package.json                       # single root package
```

`avani-actions` (reusable CI/CD workflows, §5) and any tiered marketplaces (§6 TODO) are separate repos, added when needed.

---

## 8. Pipeline

```
intake  →  calibrate  →  select  →  generate  →  review
```

1. **Intake** — parse `intake.md` → `intake_profile.json`, validated against `schemas/intake-profile.schema.json`. Static question templates per profile (AI generation later, behind a `Provider` interface — deterministic-first, runs offline).
2. **Calibrate** — per-profile TypeScript module maps intake → dials + invariants in one typed function. Typed modules beat a JSON rules DSL at this scale. Output validated against `schemas/calibrated-config.schema.json`.
3. **Select** — dials → `enabledPlugins` + blueprint list. Tier 1 always in.
4. **Generate** — stamp selected blueprints, emit remaining artifacts into `./.staging/` **inside the project dir** (same filesystem → atomic `rename` promotion). Hooks scale by sensitivity × stage (§3).
5. **Review** — human gate before promotion; `generate` emits a review checklist so an operator can run it.

### Verified platform syntax (do not regress)

- Permissions: `"permissions": { "deny": ["Read(./.env)", "Read(./.env.*)"] }` — not a top-level `deny` key.
- MCP: `.mcp.json` at project root with `"mcpServers"` — not `.mcp/servers.json`.
- SKILL.md frontmatter: `name`, `description`, `when_to_use`, `allowed-tools`, … — **no** `trigger` field.
- Bash scoping: `Bash(npm run *)` (space + wildcard), not `Bash(npm)`.
- Plugin manifest `.claude-plugin/plugin.json`; marketplace `.claude-plugin/marketplace.json`; install `/plugin marketplace add owner/repo` → `/plugin install name@marketplace`.
- Project settings `extraKnownMarketplaces` + `enabledPlugins` prompt install on trust.
- Headless cost: `total_cost_usd` only in the final `result` message (cumulative); no incremental `cost_update` event.

---

## 9. Learning Loop

- Every run logs engine vs. final human choices to `decisions.jsonl`: `{"dial":"correctness_bar","engine_value":"standard","final_value":"strict","reason":"client audit"}`.
- `calibrate retro <project>` diffs them and proposes edits to profile modules / selection map.
- **Override rate per profile** is the accuracy metric; its trend across projects is the compounding metric.

---

## 10. Contracts & Testing

- **Contracts:** `schemas/intake-profile.schema.json`, `schemas/calibrated-config.schema.json` define every layer boundary; all pipeline I/O is validated.
- **Golden fixtures:** `examples/<app>/` pairs a real input with expected outputs; CI snapshot-diffs the full pipeline. Harvested from shipped apps — the primary test suite.

---

## 11. CLI

```
calibrate init       # start intake
calibrate calibrate  # intake → dials + plugin/blueprint selection
calibrate generate   # stamp blueprints + emit artifacts to ./.staging/
calibrate stage      # show / promote project stage (dev → staging → production)
calibrate sync       # re-stamp blueprints from current templates (diff + approve)
calibrate handoff    # produce a deliverable variant (--strip for code-only)
calibrate retro      # compare engine decisions vs. overrides
```

| Exit code | Meaning |
|---|---|
| 0 | success |
| 1 | validation failure |
| 2 | review rejected / staging not promoted |

Tooling: TypeScript strict + `tsx` + `vitest`. Single root `package.json`, npm.

---

## 12. Roadmap

| Phase | Deliverable | Done when |
|---|---|---|
| **0 — Harvest** | Mine shipped apps → `avani-core` + language plugins + `marketplace.json` | avani-core useful in ≥2 existing apps |
| **1 — Tier 2 + blueprints** | Stack/domain plugins; `ts-nextjs-prisma` + `python-fastapi` blueprints; `avani-actions` reusable workflows; 2 golden fixtures | Plugins + blueprints used by hand in a real project |
| **2 — Engine** | Schemas, intake, profile modules, selection map, generators, golden tests | Engine reproduces a shipped app's config with ≤ a handful of edits |
| **3 — Stage + CI/CD** | Stage convention + escalating hooks; deploy profiles (§4.2) stamped per target — `deploy.yml`, health route, env manifest, backup job — starting with the shipped `railway` row; multi-env pipeline via reusable workflows | Promoting a project escalates enforcement without regeneration; one project deployed end to end from a stamped profile |
| **4 — Learning loop** | `decisions.jsonl`, `retro` | First retro produces a real profile update |
| **v2 (deferred)** | Headless exec, budget enforcement, subagents, operator/licensing packaging | — |

---

## 13. Open Questions / TODO

- **Marketplace tiering (deferred, §6):** separate repos (public / client-safe / moat) vs. one access-controlled marketplace vs. two tiers. Decision needed before the first client licensing handoff.
- **`avani-actions` versioning:** moving `@v1` tag vs. pinned SHAs for reusable workflows — trade reproducibility against fix-propagation speed.
- **GCP infrastructure as code:** Terraform is the house position (§4.2) by analogy with "AWS ⇒ always CDK"; confirm against the first GCP project — CDK for Terraform would keep one IaC language across clouds.
- **Stage promotion authority:** who/what may flip a project to `production` (human-only gate vs. CI-driven), and how the audit trail records it.

---

## 14. Risks & Success Metrics

| Risk | Mitigation |
|---|---|
| Claude Code plugin/skill APIs drift | Verified-syntax section (§8) tracked against docs; AI invocations behind `Provider` |
| Harvested knowledge too app-specific | Phase 1 gate requires reuse in a *different* real project first |
| Blueprint templates drift from shipped reality | Blueprints originate from harvested apps; golden fixtures diff stamped output in CI |
| Stamped CI can't be fixed across repos | Thin blueprints call versioned reusable workflows (§5) |
| Competitor copies patterns | Moat = calibration data + domain plugins, which compound; machinery is fungible |

| Metric | Target |
|---|---|
| Regeneration test vs. handwritten config of a shipped app | ≤ a handful of edits |
| End-to-end setup time | < 5 minutes |
| Override rate across consecutive projects | declining |

---

**End of Specification**
