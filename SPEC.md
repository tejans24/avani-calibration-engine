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
| `infra` | vercel · aws · self-hosted | |
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
| **3 — Stage + CI/CD** | Stage convention + escalating hooks; multi-env deploy pipeline via reusable workflows | Promoting a project escalates enforcement without regeneration |
| **4 — Learning loop** | `decisions.jsonl`, `retro` | First retro produces a real profile update |
| **v2 (deferred)** | Headless exec, budget enforcement, subagents, operator/licensing packaging | — |

---

## 13. Open Questions / TODO

- **Marketplace tiering (deferred, §6):** separate repos (public / client-safe / moat) vs. one access-controlled marketplace vs. two tiers. Decision needed before the first client licensing handoff.
- **`avani-actions` versioning:** moving `@v1` tag vs. pinned SHAs for reusable workflows — trade reproducibility against fix-propagation speed.
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
