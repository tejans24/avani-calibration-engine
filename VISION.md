# Avani Calibration Engine — Vision & Decision Architecture

**Status:** Living design notes, v2 (companion to [SPEC.md](./SPEC.md), which covers engine mechanics).
**Purpose:** Capture the decision-architecture, standards model, execution model, LLM strategy, and business model, plus a roadmap to build each piece.

---

## 1. North Star

Take a project from **idea → a correct, opinionated, codified baseline** — fast and consistently — then **hand off cleanly at the complexity boundary** where bespoke human architecture takes over. After ship, operate the resulting **fleet** of consistent projects at playbook cost.

The system is **assisted, not automated**: it asks brilliantly, proposes with rationale, and scaffolds deterministically, reserving scarce human judgment for the decisions that actually need it. The moat is **calibration judgment + execution velocity + compounding decision data** — not the tooling, which is fungible.

---

## 2. The Six Core Principles

Every domain the design has touched resolves into these — new domains stopped producing new principles (the sign of convergence). When extending the system, check the extension against them.

1. **Select, don't generate.** Deep knowledge lives in versioned, central artifacts (plugins, blueprints, tokens, factories); the engine selects and composes per project, generating only project-specific residue. Fix once → all future projects inherit.
2. **Standardize the layer beneath the choice.** Not the component library — the tokens and behavior contracts under it. Not the framework — the decision and conventions around it. Not the seed files — the factories under them. Consistency comes from shared inputs, not shared frozen dependencies.
3. **Regime awareness.** Enforcement escalates with what's at stake: stage (dev → staging → production), launch (the DB stops being disposable), migration class (additive vs destructive). Gates arm at the regime flip and never leak backward into exploration speed.
4. **Deterministic gates + human judgment at tiers.** Mechanics run below (tests, lints, classification, CI); humans decide at declared tiers (auto / propose / ask). Ask-tier decisions materialize as real stops — a pipeline pause, a review gate — not as vibes.
5. **LLM-influenced, never LLM-dependent.** Models elicit, propose, explain, and *author* (skills, seed pools, drafts); the deterministic core decides, validates, and reproduces. Everything runs without a model; everything is better with one. Provider-agnostic by construction.
6. **Consistency → fleet economics.** Careful once in the template = cheap N times forever. Discovery, maintenance, and retainers — traditionally unprofitable — become profitable because every instance shares one shape.

---

## 3. The Decision Model — a Constraint Graph, not a Tree

Decisions look tree-like (earlier answers prune later questions) but are truly a **constraint graph (DAG)**: threads impact each other laterally. Model as independent **dials** with **local pairwise constraints**, walked by a **resolver** — never a hand-authored mega-tree (combinatorial explosion; same reason we chose typed rules over a JSON DSL).

**Constraint types:** **requires** (`infra = aws` → `iac = cdk`; Django → persistent host) · **excludes** (WebSockets-at-scale ⊘ pure-serverless; Svelte ⊘ React-only libs) · **influences** (`scale_horizon = high` shifts infra toward flat-cost/portable, penalizes pricing cliffs).

**Why not a tree — the proof:** *internal tool, might 10x, enterprise SSO, real-time dashboard* → SSO excludes Clerk-basic; realtime excludes pure-serverless-Vercel; 10x penalizes Vercel cliffs. **Net: framework stays Next.js, infra ≠ Vercel.** A `nextjs → vercel` tree edge gets this wrong; infra is a function of three upstream threads converging.

**Two stacked DAGs:**
```
interview answers → [decision constraint graph] → resolved dials
                 → [selection map DAG]          → generated project
```
The lower DAG is built (`selection/graph.html`). The tree is a **rendering** of the graph for the human; the graph is the source of truth.

**Decision tiers** (the human-in-the-loop, made structural — every dial carries one):
- **Auto** — safe, reversible; system decides ("use Zod").
- **Propose** — system recommends + rationale; human confirms/overrides (most architecture).
- **Ask** — context-dependent, no safe default; system must stop and surface it.

---

## 4. The Interview (the moat)

Intake becomes a **structured architectural interview** grouped by decision area. Each question declares: `affects` (dials), `default` + **rationale**, `tier`. The moat = the questions + the rationale + the human judgment at the Ask tier — a checklist a novice can't produce. Interviews compound via the learning loop.

The interview's value includes **fixing the question itself**: "OAuth vs JWT vs Clerk" is a category error (protocol vs format vs managed provider); the real decision is build-vs-buy, then context → provider. Sample revealing questions: *"Does anything outside your own frontend call this API?"* · *"Who logs in — consumers, your team, or another company's employees? Compliance/residency constraints?"*

---

## 5. Standards & Knowledge Placement

| Standard | Home |
|---|---|
| Universal discipline (git, testing, review, security) | `avani-core` |
| **Accessibility** | `avani-core` skill **+** blueprint (eslint-a11y/axe) **+** invariant (axe-clean) — the reusable trifecta |
| Language style | `avani-typescript` / `avani-python` |
| Framework + form etiquette | `avani-nextjs` (and peers) |
| Component library | a separate, swappable **behavior** axis (§6) |

**Accessibility is the exemplar reusable standard** — semantics-based, identical across projects and component libraries, enforceable automatically. **Form etiquette without a component library:** RHF (state) + Zod (validation) + an abstract **Field contract** (`value/onChange/onBlur/name/id/aria-invalid/aria-describedby/disabled`); the component library merely satisfies the contract.

---

## 6. Component Consistency Without a Shared Component Library

No lib-agnostic tech bundles behavior *and* styling reusably — styling is inherently project-specific (why the shared-lib dream and Web Components keep failing). The two layers beneath styling are reusable:

- **Design tokens** — color/space/type/radii + **light/dark** as CSS custom properties (W3C DTCG / Style Dictionary compatible). Versioned, portable data.
- **Headless behavior + a11y primitives** — Radix / React Aria / Ark (Zag): keyboard, focus, ARIA — the hard part, identical everywhere.

**"Recreate consistently," precisely:** regenerate styled components per project, derived from the *same tokens + same headless primitive + same a11y contract* — consistent by shared inputs, not a frozen dependency (the shadcn copy-in insight).

---

## 7. Decision Areas Catalog

Existing dials: `correctness_bar`, `sensitivity`, `infra`, `runtime`, `topology`. To add:

| Dial | Decides | Key question / rule | Tier |
|---|---|---|---|
| `framework` | Next.js / Django / Rails / SvelteKit / … | cascades → deploy → cost; **support tiers** (deep / recommend-thin / out-of-scope) | Propose |
| `api_style` | none (RSC/actions/tRPC) / REST / GraphQL / gRPC / WS | *"Does anything outside your frontend call this?"* — most apps over-build an API | Ask/Propose |
| `auth_provider` | Clerk / WorkOS / Auth0 / self-host | *"Who logs in? Compliance/residency?"* — enterprise SSO/SCIM forces provider | Ask |
| `realtime` | none / SSE / WS / managed | excludes pure-serverless at scale | Propose |
| `data_store` | Postgres / serverless DB / client warehouse | data gravity | Propose |
| `deploy_target` + `iac` | Vercel / Fly / Railway / AWS(+CDK) | preference/constraint else default path; **AWS ⇒ always CDK** | Propose/Ask |
| `component_behavior` | Radix / React Aria / Ark | behavior axis; style from tokens | Auto/Propose |
| `scale_horizon` | now-only / might-10x / acquisition | reweights cost cliffs + lock-in everywhere | Propose |

**Decision breadth vs implementation depth:** advise across many options; *generate deeply* only for harvested stacks. Honest support tiers at the seam — trust comes from saying "Rails is right for you, and it's outside our deep-support lane."

---

## 8. Cost / TCO Model

Cost is an **input** (budget) and a **derived output** (TCO from resolved dials): deploy target, monthly hosting, ops burden, scaling cliffs. Vercel/Fly = low ops, predictable start, cliffs at scale; AWS = powerful, architecture-dependent cost (human needed sooner). Framework → deploy → price → maintenance is one linked cascade. TCO is a first-class client deliverable — often the deciding factor.

---

## 9. Handoff Boundary

Structure up to the complexity boundary; human architect beyond it. **Codify-everything is what makes handoff clean** — the human inherits diffable CDK/config/conventions, never a black box ("always CDK" and "clean handoff" are the same idea). The boundary moves by provider (AWS sooner). The system **states its own boundary** — that honesty is part of the trust and the moat.

---

## 10. LLM Integration — Influenced, Provider-Agnostic

**Split by job:** the engine *decides and enforces* (constraint resolution, selection, validation, reproducibility). The LLM *proposes, explains, drafts*: elicitation (idea → questions; free-text → dials), recommendations + rationale, conflict explanation, vendor-landscape gap-filling, prose drafting, and **data authoring** (§15).

**Mechanics:** one `Provider` interface (`complete(prompt, schema?)`); adapters per vendor; **neutral I/O** — results validated against our Zod/JSON-Schema (the schema layer is the handshake); neutral prompts in `prompts/`; mix providers by task; cross-check high-stakes recommendations; **graceful degradation** — no provider → deterministic defaults + human answers still run.

**Grounding caution:** LLM knowledge of vendor specifics (pricing, SCIM, limits) goes stale/hallucinated — factual claims must be search-grounded/cited or human-verified before entering a decision, especially anything client-facing.

---

## 11. The Context Delivery Stack

*Can all this knowledge feed an LLM without bloating context?* Yes — bloat only afflicts knowledge that's **always loaded**; the architecture is a system for loading knowledge at the moment of relevance. Five channels, descending context cost:

1. **CLAUDE.md** — thin, always loaded (< 200 lines): dials, commands, invariants, gotchas. An index, not an encyclopedia.
2. **Skills** — loaded on trigger; only the one-line description is permanent. Procedures live here.
3. **Exemplar code** — zero cost until read; agents imitate neighboring code, so the stamped exemplar teaches patterns *as code*.
4. **Hooks** — injected at the triggering action (deploy checklist at the deploy command).
5. **Deterministic gates** — zero context, ever: every rule pushed into a test/lint/constraint/CI is a rule never spent on tokens. The failing test *is* the instruction, delivered at the right moment with a reproduction attached.

**Maxim: push knowledge as far down the stack as it can go.** Prose only for judgment; skills for procedures; code for patterns; gates for rules. The red→green feedback cycle replaces standing instruction.

**Claude Code ships these mechanisms — empty.** Auto-loaded CLAUDE.md, on-demand skills, hook infrastructure, subagent orchestration, the test-fix loop: all default *machinery*, no default *content*. The gap between a stock install and a calibrated one **is the product**. Corollary: don't write policy for what the model already does well by default (reading code, running tests); encode only where the default would *guess* (which mock, which boundary, what never to weaken).

---

## 12. Service Architecture & Testing

**The economics of testing flipped: tests are the control surface.** LLMs write, run, and fix tests cheaply — so tests stop being a cost center and become the mechanism that lets you trust agent output without reading every line. "Done when tests pass" is only meaningful if tests pin behavior. Verification converts LLM speed into reliability; confidence per layer is what permits autonomy.

**Service shape (encoded):** explicit typed interface per service; Zod/Pydantic at the boundary; **no framework imports inside services** (testable without a server, reusable across delivery mechanisms); collaborators injected (mocking trivial). **A service isn't done without its tests** — service + interface + unit test + mock generated together.

**Pyramid mapped to layers:**

| Tier | Scope | Mocks |
|---|---|---|
| Unit (majority) | one service, isolated | collaborators mocked via contracts |
| Integration (the seams) | service + **real** DB | no DB mocks — the DB is what you must not fake |
| Playwright (few) | critical flows, real stack | only third-party edges |

**Mock policy:** mock only boundaries you own; wrap third parties (Stripe/Clerk) in adapters and mock the adapter; never mock the thing under test; **contract tests keep mocks honest** (same suite runs against mock and real).

**Services are the task decomposition unit:** a roadmap task = "implement service X to satisfy contract Y; tests are acceptance criteria" — one session, self-verifying. Contracts-first enables parallelism: lead commits interfaces + mocks; workers implement in parallel; integration verifies the join.

**Anti-pattern (LLM-era):** green-by-weakening — agents "fixing" a failing test by softening the assertion. Rule: *fix the code, not the test; changing assertions is a declared decision, never a fix.* (Future: a hook that flags assertion-softening diffs.) Churn prevention: test behavior at the contract, not internals.

**Real DB best practice:** ephemeral Postgres via testcontainers/compose (hermetic, codified); integration setup runs `prisma migrate deploy` from empty — **the migration path itself is continuously tested**; `migrate diff` drift check in CI; template-database + rollback-per-test for speed; CI ladder: unit → integration (service container) → e2e, fail cheap first. Invariants test at the tier where they live (append-only at DB tier, fuzzing at service tier).

---

## 13. The Execution Layer

The engine also generates the *plan for building* and the *compute policy for executing it*. Articulate once → generate → execute in short cheap sessions → track. The long design conversation happens once; everything after is a short session against a crisp task.

**Separate the roadmap from the routing:**
- **Roadmap = durable state.** Tasks with status, acceptance criteria, and *shape tags*: complexity (`mechanical | standard | judgment`), risk, parallelizable. True about the task forever. **No model names in the roadmap.**
- **Routing policy = one small file.** Shape tags → capability tier (`frontier | standard | fast`) → *currently best* model + worker shape. Model names churn; the policy is one line to update. (Provider-agnostic principle applied to compute.)

**Worker discipline:** single worker is the **default**; orchestration must justify itself (coordination overhead is real). Fan out only for structural parallelism (N independent files/services) or independent-perspective verification. **Configure Claude Code's native orchestration** (`.claude/agents/` with model frontmatter, subagents, background tasks) — never build a bespoke orchestrator.

**Session continuity:** task granularity = session granularity. Each item sized for one session; on completion the session flips status, appends a one-line handoff note, commits. CLAUDE.md stays thin (conventions, not history); **the roadmap file is the memory.** New session: read roadmap → pick next unblocked task — nothing lost, nothing re-explained.

---

## 14. Launch Regime & Data Migrations

**Launch is the moment the database stops being disposable** — the stage system's defining event. Pre-launch: schema churn is free (`db:reset`, squash, iterate); the only duty is migrations-apply-from-scratch. Post-launch: every schema change is a *data* migration; irreversibility enters; the pipeline changes shape. Encoded in CI/CD:

1. **Auto-classification** (keystone — a process humans must remember gets skipped): CI lints the migration diff → `additive` (auto-applies) / `data-shape` (full procedure) / `destructive` (only as the tail of expand/contract, gated hardest). Classification posts to the PR — awareness at review time.
2. **Expand → backfill → switch → contract** for data-shape changes: skill teaches it; blueprint stamps `migrations/data/` (backfill scripts as first-class artifacts with verification queries — counts/checksums before/after); CI enforces the ordering.
3. **Shadow-DB verification:** apply migration + backfill to a production-shaped shadow DB, then **run the invariant suite against post-migration state** — a migration cannot pass CI if it violates append-only or uniqueness. Guarantees survive schema evolution by construction.
4. **Human gate = native GitHub Environments** required-reviewer on dangerous prod migrations — the Ask tier as a literal pipeline pause, checklist attached (backup? backfill verified? plan?). No custom tooling.
5. **Disciplines stated outright:** migrations run *before* app deploy (expand-phase compatible with old code = zero-downtime ordering); **forward-only** (a down-migration that pretends to un-backfill data is a lie; roll forward).
6. **Gates arm at the stage flip only** — never leak into dev; pre-launch speed is the point.

Launch = `calibrate stage promote`: a one-time recorded transition that swaps the fast-loop pipeline for the gated one — fleet-wide, because the blueprint stamps the same pipeline everywhere.

---

## 15. Seed Data System

Seed data is **infrastructure with many consumers**: local dev, test fixtures, shadow-DB verification, Playwright, demos. Layered (standardize-the-layer-beneath, applied to data):

1. **Factories** — per-model builders (faker + domain constraints), **invariant-valid by construction** (fuzzed public coords, PostGIS-valid geometries, append-only chains) — seeds continuously exercise the guarantees.
2. **Scenarios** — named composed states ("org with 3 coordinators, 200 observations, 5 unsynced") — shared vocabulary; double as Playwright preconditions.
3. **Env seeds** — thin compositions per environment, **separated by command**:

| Command | Contents | Guard |
|---|---|---|
| `db:seed` | dev: rich, messy, edge-case-heavy | **refuses when `AVANI_STAGE != dev`** (hard gate — faker-in-prod is a career-limiting incident) |
| test fixtures | minimal, per-test, from factories (never the dev seed — slow + coupled) | — |
| `db:seed:demo` | curated, presentable | staging/demo only |
| `db:init` | prod: **reference data only** (roles, categories, species lists) — not seeding, *initialization*; belongs with migrations/deploy | no faker, ever |

**LLM as data author, not runtime:** LLM generates domain-plausible sample pools (species names, field notes) *once at authoring time*, committed as static data; runtime draws via **seeded RNG** → fully deterministic, reproducible databases (what makes shadow verification and golden tests trustworthy).

**Privacy dividend:** for `sensitivity: protected`, synthetic scenario seeds *are* the production-shaped dataset — no anonymized prod snapshots ever needed.

Blueprint stamps the structure + one exemplar; `npm run dev` bootstraps migrate + seed → clone, install, one command, working app with rich data.

---

## 16. Fleet Operations & the Retainer

Everything before ship is half the story — **products live for years.** Generated projects aren't snowflakes; they're instances of one calibrated shape, which converts maintenance from **O(N) bespoke archaeology into one playbook + N cheap mechanical applications** (the execution layer's fast tier).

- **`.avani/manifest.json` is the fleet registry** (built for reproducibility, doubles as ops): "which projects run avani-nextjs < X" is a query, not archaeology.
- **CVE walk-through:** patch lands → fleet query → fast-tier agent applies the same-shaped fix per project → **each project's own tests + invariant gates certify independently** → human reviews N green PRs. A week of work becomes a morning, and it's *safe*, not just fast.
- **Business act three: discovery → build → retainer.** Retainers price like bespoke maintenance but cost like a playbook run — the engine makes the traditionally-unprofitable stage profitable, again. Arguably the strongest moat expression: anyone can copy an architecture; nobody can cheaply maintain a fleet they didn't generate.
- **Production incidents are harvest events:** a bug in project 3 becomes a baseline invariant/test; projects 4..N inherit the immunity via central plugins. The fleet is collectively *hardened*, not just maintained.

**Cautions:** fleet economics require staying on-shape — a client-modified handoff project leaves the fleet (make the boundary explicit in retainer terms; drift is mechanically detectable via manifest + conformance check). Don't build fleet tooling before a fleet exists — the manifest already future-proofs it at zero present cost.

---

## 17. Baseline vs Harvest (revised)

Two kinds of knowledge with different sources of truth:

- **Convergent** (industry-settled: a11y, testing tiers, service isolation, git hygiene, migration discipline) → **author the baseline now**, confidently — no harvest needed to validate it.
- **Divergent** (your taste, domain moves, hard-won gotchas, stack quirks) → **harvested as enrichment** from existing projects — mined for *content*, not structure.

Existing projects are CLAUDE.md-only (the only channel known at the time): inconsistent, project-specific, everything crammed into the always-loaded layer. Their *structure* is obsolete; their *content* is ore. The refactoring: redistribute each line down the context stack (repeated across projects → plugin skill; procedure → triggered skill; hard rule → hook/gate; pattern → exemplar; truly project-specific → stays, now thin). Whatever appears in ≥2 old files is by definition a baseline candidate.

The inconsistency across old projects is not an obstacle — **it is the disease the engine cures.** Harvest is a background activity (lift gems when visiting old repos), never a blocker. "Harvest, don't invent" survives, correctly scoped: it was always about not inventing *the moat* — not about rediscovering the testing pyramid.

---

## 18. Engagement Contexts & Business Model

**Defaults by context** set the decision tiers: `self` / `avani-internal` → house presets, dials drop to Auto, skip the interview, ship (dogfoods + feeds the learning loop). `client` → full interview, Propose/Ask live, cost + quote output. One engine, two economic modes.

**The funnel (market standard = paid discovery):**

| Stage | Price | Engine fidelity | Deliverable |
|---|---|---|---|
| Pre-engagement qualifier | Free | shallow calibrate | Directional: profile, rough scope, cost/timeline *range*. Competence signal; qualifies. |
| Discovery / architecture sprint | **Paid** (credited to build) | full interview | Architecture overview + roadmap + fixed-price quote + risk — *the paid product*. |
| Build | Project | generate + execution | The codified project. |
| **Retainer** (§16) | Recurring | fleet ops | Maintained, hardened, patched — at playbook cost. |

**IP protection:** (1) charge for discovery — walking away isn't free extraction; (2) **give the WHAT, not the HOW** — decisions + roadmap (menu), never plugins/invariants/calibration/CDK (kitchen); (3) the architecture shape is semi-fungible anyway — the real moat (velocity, consistency, calibration data) can't be taken; price the *synthesis for this client*; (4) progressive disclosure by stage.

**Leverage:** the engine makes discovery minutes-cheap → the stage consultancies lose money on becomes a profitable, scalable funnel that feeds the learning loop. **Cautions:** a human signs every client-facing quote (strongest Ask-tier case); keep the free tier genuinely thin.

---

## 19. The MVP — `avani new`

**The personal, deterministic project generator: encode once, use forever, zero LLM churn.** The long design conversation was the last one — every future project is a command, not a chat.

| | |
|---|---|
| **In** | One command → your default stack, deterministic (zero LLM calls at runtime): a **runnable** skeleton (`npm install && npm run dev` works — app structure, prisma schema, db scripts, CI, seeds) + real plugin skills (a11y, discipline, services, forms, migrations) + `.claude/` fully wired + roadmap/routing files (§13) |
| **Out (later)** | Interview, constraint graph, decision tiers, cost model, other frameworks, LLM layer, client/business mode |
| **Success bar** | Scaffold a real project faster than `create-next-app` + manual setup; a Claude session in it is already expert; never re-have this conversation |

The MVP **is the baseline** (§17): authored convergent knowledge + one stack made genuinely deep. Harvest enriches it in the background. Default stack: **TBD by owner** (the one open input).

---

## 20. Roadmap

Built: schema/contracts, selection map (DAG + viz), calibration, generate layer, plugins (core, typescript, python, nextjs), end-to-end golden pipeline — **and the MVP (A → B2 → B3)**: baseline skills (a11y + discipline in core; forms/db-migrations/service-design in nextjs; `a11y_axe_clean` invariant), the runnable `ts-nextjs-prisma` blueprint (stamped by `generate`), and `avani new` self mode with ROADMAP.md + routing-policy stamping.

| Phase | Piece | Depends on |
|---|---|---|
| **A** | **Baseline skills** — avani-core (accessibility, engineering-discipline), avani-nextjs (forms, db-migrations, service-design); a11y invariant | plugins |
| **B** | **Design tokens** — versioned tokens.json (+ light/dark) → CSS vars; component scaffold vs tokens + headless primitive | A |
| **B2** | **MVP blueprint** — runnable ts-nextjs skeleton: app structure, prisma, db scripts, CI ladder, testcontainers, factories/scenarios/seeds (§15), exemplar service + 3 test tiers (§12) | A |
| **B3** | **`avani new` (self mode)** — one-command preset, skip intake; roadmap + routing-policy files stamped (§13) | B2 |
| **C** | **Decision dials expansion** — framework(+support tiers), api_style, auth_provider, realtime, data_store, deploy+iac, component_behavior, scale_horizon | selection |
| **D** | **Constraint graph + resolver** — requires/excludes/influences; conflict detection; interview flow derived | C |
| **E** | **Decision tiers** — auto/propose/ask on every dial | D |
| **F** | **Structured interview** — question catalog (affects/default/rationale/tier); free-text → dials | D, E |
| **G** | **Cost/TCO model** | C |
| **H** | **Roadmap generation** — ROADMAP.md phased by hints + mitigations + timeline | generate |
| **I** | **LLM Provider interface** — adapters, schema I/O, grounding, degradation | schema |
| **J** | **Migration pipeline** — classifier, expand/contract enforcement, shadow-DB + invariant verification, environment gates (§14) | B2 |
| **K** | **Engagement contexts + funnel** — self/internal/client; qualifier; discovery deliverable (WHAT-not-HOW) | E, F, G |
| **L** | **Fleet ops** — conformance/drift check, fleet queries, patch playbooks (§16) — *only once a fleet exists* | B3 shipped projects |
| **M** | **Learning loop** — decisions.jsonl, retro, override-rate | F |
| **N** | **AWS/CDK deep support** — harvest-driven | C |

**Sequencing:** **A → B2 → B3 is the MVP** — build it, use it on a real project, let reality correct it. Then C→D→E→F (the decision core / moat), then the rest as pulled by need. Capture-then-build; depth is vertical now, not horizontal.

---

*Keep this doc alive — append as thinking evolves; promote settled pieces into SPEC.md + code.*
