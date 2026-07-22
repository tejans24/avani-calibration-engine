# Avani Calibration Engine — Technical Specification

**Version:** 0.3.0
**Status:** DRAFT (approved direction; engine implementation not started)
**Last Updated:** 22 Jul 2026

---

## 1. Outcome

The engine takes an **application spec** (raw idea + intake Q&A) and produces a repo where any Claude Code session that opens it is already an expert — in universal engineering standards *and* in that app's specific domain constraints.

It emits exactly four artifacts:

| Artifact | Purpose |
|---|---|
| `.claude/settings.json` | Declares the Avani marketplace + **selected** plugins (`extraKnownMarketplaces`, `enabledPlugins`), permissions, sensitivity-scaled hooks |
| `CLAUDE.md` | Thin project-specific layer: architecture, commands, gotchas (< 200 lines) |
| `tests/invariants/*.test.ts` | Executable guarantees derived from calibration (append-only, uniqueness, fuzzing) |
| `.mcp.json` | MCP servers matching the selected stack |

**Core principle: knowledge is selected, not generated.** Deep knowledge (skills, hooks, patterns) lives in centrally versioned plugins. The engine's job is calibration → *selection* of plugins, plus generation of the small project-specific residue above.

### Why plugins

- **Central versioning solves drift.** Improve a plugin once; the marketplace catalog pins releases (commit SHA), so existing projects stay reproducible while new projects get the latest.
- **Namespacing.** Plugin skills are invoked as `avani-core:security-scan` — no collisions.
- **Licensing path is built in.** A client licensing the system = access to the marketplace repo. Distribution is git.

---

## 2. Two-Tier Knowledge Model

### Tier 1 — Universal (always enabled)

`avani-core`: security scanning, git workflow, code style (TS strict conventions), testing discipline, secrets-blocking hooks. Enabled in **every** generated project unconditionally — and installable in any existing project, engine or not. Tier 1 ships value before the engine exists.

### Tier 2 — Conditional (selected by application spec context)

| Plugin | Contents | Selected when |
|---|---|---|
| `avani-nextjs` | App Router conventions, RHF + Zod form patterns | `infra = vercel` |
| `avani-postgis` | PostGIS setup, geo queries | geo data in profile |
| `avani-clerk` | Roles, middleware, invite flows | `auth_model = clerk-*` |
| `avani-stripe` | Payment invariants, webhook handlers | money transactions |
| `avani-offline` | Sync engine, Zustand queue, PWA manifest | `offline_required = true` |
| `avani-field-data` | offline-sync, coordinate-fuzzing, append-only invariants (domain moat) | `sensitivity ≥ high` + field-data profile |

The calibration dials are the selection function. Selection logic is a typed `dials → plugin[]` map in the engine — not a generator, not a rules DSL.

---

## 3. Repo Structure (single repo = engine + marketplace)

```
avani-calibration-engine/
├── .claude-plugin/
│   └── marketplace.json          # this repo IS the marketplace
├── plugins/
│   ├── avani-core/               # Tier 1
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/<name>/SKILL.md
│   │   └── hooks/                # e.g. block-secrets
│   ├── avani-nextjs/             # Tier 2 (Phase 1)
│   ├── avani-postgis/
│   ├── avani-clerk/
│   ├── avani-stripe/
│   ├── avani-offline/
│   └── avani-field-data/         # Tier 2 domain (moat)
├── engine/
│   ├── bin/calibrate.ts          # CLI entry
│   ├── src/
│   │   ├── intake/               # spec/Q&A → intake_profile.json
│   │   ├── profiles/             # per-profile calibration modules (field-app.ts, saas.ts, …)
│   │   ├── select/               # dials → plugin list
│   │   └── generate/             # CLAUDE.md, settings, invariant tests, .mcp.json
│   └── tests/
├── schemas/                      # JSON Schemas: the layer contracts
├── examples/                     # golden fixtures harvested from real shipped apps
├── package.json                  # single root package (no monorepo)
└── SPEC.md
```

Split the marketplace into its own repo only when licensing/access-control demands it.

---

## 4. Pipeline

```
intake  →  calibrate  →  select  →  generate  →  review
```

1. **Intake** — parse `intake.md` (Q&A) → `intake_profile.json`, validated against `schemas/intake-profile.schema.json`. Question sets are static templates per profile type. (AI-generated questions come later, behind a `Provider` interface — the engine is deterministic-first and runs offline.)
2. **Calibrate** — a per-profile TypeScript module (`profiles/field-app.ts`) maps intake → dials + invariants in one typed function. With ~3 profile types, typed modules beat a JSON rules DSL: type-checked, debuggable, no expression grammar to specify. Extract a data-driven engine later only if real repetition demands it. Output validated against `schemas/calibrated-config.schema.json`.
3. **Select** — dials → `enabledPlugins` list. Tier 1 always in; Tier 2 per the table in §2.
4. **Generate** — emit the four artifacts (§1) into `./.staging/` **inside the project directory** (same filesystem, so `rename` promotion is atomic). Hook severity scales with the sensitivity dial:

   | Sensitivity | Hooks enabled |
   |---|---|
   | low | secrets block only |
   | medium | + lint/typecheck on Stop |
   | high | + append-only enforcement, migration guards |
   | protected | + coordinate-fuzzing checks, audit logging |

5. **Review** — human gate before promoting staging → project. `generate` also emits a **review checklist** (e.g. "verify sensitivity=protected matches the client's data description") so an operator — not only the author — can run the gate.

### Verified platform syntax (do not regress)

- Permissions: `"permissions": { "deny": ["Read(./.env)", "Read(./.env.*)", "Read(./secrets/**)"] }` — *not* a top-level `deny` key.
- MCP config: `.mcp.json` at project root with `"mcpServers"` key — *not* `.mcp/servers.json`.
- SKILL.md frontmatter: `name`, `description`, `when_to_use`, `allowed-tools`, … — there is **no** `trigger` field; trigger phrases go in `description`/`when_to_use`.
- Bash permission scoping: `Bash(npm run *)` (space + wildcard), not `Bash(npm)`.
- Plugin manifest: `.claude-plugin/plugin.json` (`name` required; `version`, `description`, `author` optional). Marketplace: `.claude-plugin/marketplace.json`; install flow `/plugin marketplace add owner/repo` → `/plugin install name@marketplace`.
- Project settings keys `extraKnownMarketplaces` + `enabledPlugins` prompt anyone opening the repo to install the declared plugins.
- Headless cost reporting: `total_cost_usd` appears only in the final `result` message of `--output-format stream-json` (cumulative). There is no incremental `cost_update` event — any future budget enforcement must be computed from per-message token usage or `--max-turns`.

---

## 5. Learning Loop

What makes calibration compound (and the moat defensible):

- Every run logs engine decisions vs. final human choices to `decisions.jsonl`:
  `{"dial": "correctness_bar", "engine_value": "standard", "final_value": "strict", "reason": "client audit requirement"}`
- `calibrate retro <project>` diffs them, reports divergence, and proposes edits to profile modules / the selection map.
- **Override rate per profile** is the calibration-accuracy metric; its trend across projects is the compounding metric.

---

## 6. Contracts & Testing

- **Contracts:** `schemas/intake-profile.schema.json` and `schemas/calibrated-config.schema.json` define every layer boundary. All pipeline I/O is schema-validated.
- **Golden fixtures:** `examples/<app>/` pairs a real input (`input.md`, `intake.md`) with expected outputs (`calibrated_config.json`, generated artifacts). CI snapshot-diffs the full pipeline. Fixtures are harvested from shipped apps — `examples/` is the primary test suite, not demo material.

---

## 7. CLI

```
calibrate init       # start intake for a new project
calibrate calibrate  # intake → dials + plugin selection
calibrate generate   # emit artifacts to ./.staging/
calibrate retro      # compare engine decisions vs. overrides
```

| Exit code | Meaning |
|---|---|
| 0 | success |
| 1 | validation failure (schema, syntax) |
| 2 | review rejected / staging not promoted |

(Codes for API/budget errors reserved for v2.)

Tooling: TypeScript strict + `tsx` (no build step in dev) + `vitest`. Single root `package.json`, npm.

---

## 8. Roadmap

| Phase | Deliverable | Value shipped | Done when |
|---|---|---|---|
| **0 — Harvest** | Mine existing shipped apps → author `avani-core` + `marketplace.json` | Tier 1 usable in every current project, no engine needed | avani-core installed and useful in ≥2 existing apps |
| **1 — Tier 2 plugins** | Stack + domain plugins from harvested patterns; 2 golden fixtures | Knowledge packaged; selection still manual | Plugins enabled by hand in a real project |
| **2 — Engine** | Schemas, intake, profile modules, selection map, generators, golden tests | < 5-min automated setup | Engine reproduces a shipped app's config with ≤ a handful of manual edits |
| **3 — Learning loop** | `decisions.jsonl`, `retro` | Calibration compounds | First retro produces a real profile update |
| **v2 (deferred)** | Headless session exec, budget enforcement, subagent orchestration, operator/licensing packaging | — | — |

Phasing logic: each phase is independently valuable, and the engine arrives *after* the plugins it selects among exist and have been used manually — selection rules encode real usage, not guesses.

---

## 9. Risks & Success Metrics

| Risk | Mitigation |
|---|---|
| Claude Code plugin/skill APIs drift | Verified-syntax section (§4) tracked against docs; all AI invocations behind `Provider` interface |
| Knowledge harvested is too app-specific to generalize | Phase 1 exit gate requires manual reuse in a *different* real project first |
| Operator can't run the review gate | `generate` emits an explicit review checklist |
| Competitor copies patterns | Moat = calibration data (decisions.jsonl) + domain plugins, which compound; machinery is fungible |

| Metric | Target |
|---|---|
| Regeneration test: engine output vs. handwritten config of a shipped app | ≤ a handful of manual edits |
| End-to-end setup time | < 5 minutes |
| Override rate across consecutive projects | declining |

---

**End of Specification**
