# Avani Calibration Engine — Vision & Decision Architecture

**Status:** Living design notes (companion to [SPEC.md](./SPEC.md), which covers engine mechanics).
**Purpose:** Capture the decision-architecture, standards model, LLM strategy, and business model worked out in design, plus a roadmap to build each piece.

---

## 1. North Star

Take a project from **idea → a correct, opinionated, codified baseline** — fast and consistently — then **hand off cleanly at the complexity boundary** where bespoke human architecture takes over.

The system is **assisted, not automated**: it asks brilliantly, proposes with rationale, and scaffolds deterministically, reserving scarce human judgment for the decisions that actually need it. The moat is **calibration judgment + execution velocity + compounding decision data** — not the tooling, which is fungible.

---

## 2. Core Principles

1. **Knowledge is selected, not generated.** Deep knowledge lives in versioned plugins/blueprints/tokens; the engine selects and assembles, generating only the project-specific residue.
2. **Deterministic core; LLM-influenced, not LLM-dependent.** The engine decides and enforces deterministically and reproducibly. LLMs propose, explain, and draft — behind a provider-agnostic interface, degrading gracefully to pure-deterministic when absent.
3. **Standardize the layer *beneath* the choice.** Don't standardize the component library — standardize design tokens + behavior/a11y contracts under it. Don't standardize the framework — standardize the decision + conventions around it.
4. **Decision breadth vs. implementation depth.** Advise across many options; generate deeply only for stacks harvested from real work. Be honest at the seam (support tiers).
5. **Codify everything → clean handoff.** IaC, config, conventions, and decisions are all code/data, so a human inherits inspectable, diffable, reproducible ground — never a black box.
6. **The human-in-the-loop is structural**, via decision tiers (§4). The system knows the edge of what it should automate and stops there.

---

## 3. The Decision Model — a Constraint Graph, not a Tree

Decisions look tree-like (earlier answers prune later questions) but are truly a **constraint graph (DAG)**: threads impact each other laterally. Model as independent **dials** with **local pairwise constraints**, walked by a **resolver** — never a hand-authored mega-tree (which explodes combinatorially, the same reason we chose typed rules over a JSON DSL).

**Constraint types (edges):**
- **requires** — `infra = aws` requires `iac = cdk`; Django requires a persistent host.
- **excludes** — WebSockets-at-scale excludes pure-serverless; Svelte excludes React-only component libs.
- **influences** — `scale_horizon = high` shifts infra toward flat-cost/portable and penalizes vendor pricing cliffs.

**Why not a tree — the proof:** *internal tool, might 10x, enterprise SSO, real-time dashboard* →
- enterprise SSO → excludes Clerk-basic → WorkOS/Auth0-enterprise
- realtime → `realtime = websockets` → excludes pure-serverless-Vercel
- might 10x → `scale_horizon = high` → penalizes Vercel cliffs
- **Net: framework stays Next.js, but infra ≠ Vercel.** A `nextjs → vercel` tree edge gets this wrong; infra is a function of three upstream threads at once. That convergence is a graph edge.

**Two stacked DAGs:**
```
interview answers
  → [decision constraint graph]   ← "each thread impacts the other"
  → resolved dials
  → [selection map DAG]           ← already built (selection/graph.html)
  → generated project
```
The tree is a **rendering** of the graph for the human (interview flow); the graph is the source of truth.

### Decision tiers (where the human comes in)
Every dial carries a tier:
- **Auto** — safe, reversible, low-stakes; system decides (e.g. "use Zod").
- **Propose** — system recommends + rationale; human confirms/overrides (most architecture).
- **Ask** — genuinely context-dependent, no safe default; system must surface it (the real forks).

The tier field *is* the human-in-the-loop, made structural. The review gate moves earlier — into the interview.

---

## 4. The Interview (the moat)

The intake questions become a **structured architectural interview**, grouped by decision area. Each question declares:
- `affects` — which dials it drives
- `default` + **rationale** — the recommendation and why
- `tier` — auto / propose / ask

The **moat is the questions + the rationale + the human judgment at the Ask tier** — a checklist a novice can't produce, plus taste applied to a specific client's constraints. Interviews compound via the learning loop.

Interview value example — it fixes the *question itself*: "OAuth vs JWT vs Clerk" is a category error (format vs. protocol vs. managed provider). The interview reframes it to the real decision: build-vs-buy, then context → provider.

---

## 5. Knowledge Layers & Standards Placement

| Standard | Home |
|---|---|
| Universal discipline (git, testing, review, security) | `avani-core` |
| **Accessibility** (semantic/keyboard/ARIA/contrast) | `avani-core` skill **+** blueprint (eslint-a11y/axe) **+** invariant (axe-clean) — the reusable trifecta |
| Language style | `avani-typescript` / `avani-python` |
| Framework + form etiquette | `avani-nextjs` (and peers) |
| Component library | a **separate, swappable axis** — behavior, not style (§6) |

**Accessibility is the exemplar reusable standard** — semantics-based, so identical across projects *and* component libraries, and enforceable automatically (lint + axe + invariant). Write once, every project inherits conventions *and* enforcement.

**Form etiquette without a component library:** conventions are RHF (state) + Zod (validation) + an abstract **Field contract** (`value/onChange/onBlur/name/id/aria-invalid/aria-describedby/disabled`). The component library just satisfies the contract. Library-agnostic by construction.

---

## 6. Component Consistency Without a Shared Component Library

No lib-agnostic tech bundles behavior *and* styling reusably — styling is inherently project-specific, which is why the "one shared component library" dream (and Web Components, via shadow-DOM theming + React/SSR friction) keeps failing. But the two layers *beneath* styling are reusable:

- **Design tokens** — color/space/type/radii + **light/dark** as CSS custom properties (or W3C DTCG / Style Dictionary). Vendor-neutral, versioned data. The theming layer that "keeps it together."
- **Headless behavior + a11y primitives** — Radix / React Aria / Ark (Zag). The hard, reusable part (keyboard, focus, ARIA). This is where the a11y contract and the component question merge.

**"Do it consistently" precisely stated:** regenerate the styled components per project, but derive every one from the *same tokens + same headless primitive + same a11y contract* — consistent by shared inputs, not a frozen dependency (the shadcn copy-in insight). In the engine: tokens = a versioned artifact; the a11y/form contract = a skill; the headless-primitive choice = a selectable **behavior** axis; the styled components = generated per project.

---

## 7. Decision Areas Catalog (the dials/threads)

Existing dials: `correctness_bar`, `sensitivity`, `infra`, `runtime`, `topology`. To add:

| Dial | Decides | Key question | Notes / tier |
|---|---|---|---|
| `framework` (generalize `runtime`) | Next.js / Django / Rails / SvelteKit / Nuxt / … | product shape, ecosystem, future opportunities | cascades → deploy → cost; **support tiers**: deeply-supported vs recommend-thin-scaffold vs out-of-scope. Propose. |
| `api_style` | none (RSC/server actions/tRPC) / REST / GraphQL / gRPC / WebSockets | **"Does anything outside your own frontend call this?"** | most apps over-build an API; realtime → WS/SSE layered on. Ask/Propose. |
| `auth_provider` | Clerk / WorkOS / Auth0 / Supabase / self-host | **"Who logs in — consumers, your team, or another company's employees? Compliance/residency?"** | build-vs-buy; enterprise SSO/SCIM forces provider. Ask. |
| `realtime` | none / SSE / WebSockets / managed (Ably/Pusher) | live updates, presence, collaboration, field-sync | excludes pure-serverless at scale. Propose. |
| `data_store` | Postgres / serverless DB / client's warehouse | data gravity, existing systems | Propose. |
| `deploy_target` + `iac` | Vercel / Fly / Railway / AWS(+CDK) / self-host | client preference/constraint; else default path | **AWS ⇒ always CDK** (codified). Cost input + derived output. Propose/Ask. |
| `component_behavior` | Radix / React Aria / Ark / headless | a11y + interaction needs | style comes from tokens (§6). Auto/Propose. |
| `scale_horizon` | now-only / might-10x / acquisition-likely | future opportunities vs YAGNI | reweights cost cliffs + lock-in across dials. Propose. |

---

## 8. Cost / TCO Model

Cost is **both an input** (budget constraint) **and a derived output** (TCO computed from the resolved dials). The `estimated_infra_monthly_usd` currently hardcoded becomes a real derivation:

- **Vercel/Fly** — low ops, predictable start, pricing cliffs at scale.
- **AWS** — flexible/powerful, higher ops, cost is architecture-dependent (needs a human sooner for cost tuning).
- Framework → deploy target → hosting price → maintenance burden is a single linked cascade.

TCO is a **first-class client deliverable** — often the deciding factor, and valuable consulting output.

---

## 9. Handoff Boundary

The system provides **structure up to the complexity boundary**, then a human architect takes over. It does not design bespoke distributed systems; it sets correct, consistent, codified ground so the human starts from a baseline, not a blank page.

- **Codify-everything is what makes handoff clean** — the human inherits editable CDK/config/conventions, not a black box. "Always CDK on AWS" and "clean handoff" are the same idea.
- **The boundary moves by provider** — AWS needs the human sooner (architecture-dependent cost) than Vercel/Fly.
- **The system states its own boundary** — "we'll get you a codified, deployed baseline; beyond ~this scale you'll want an architect for X." That honesty is part of the trust and the moat.

---

## 10. LLM Integration — Influenced, Provider-Agnostic

**Split by job:** the engine *decides and enforces* (constraint resolution, selection, validation, reproducibility — never the LLM). The LLM *proposes, explains, drafts* — for the human:
- elicitation (idea → questions, parse free-text → dials)
- proposing recommendations + rationale
- explaining conflicts the resolver surfaces
- gap-filling across the vendor landscape (Clerk vs WorkOS, Vercel vs Fly)
- drafting prose (CLAUDE.md, roadmap, cost writeup)

**Provider-agnostic mechanics:**
- a single `Provider` interface (`complete(prompt, schema?)`), adapters for Claude / GPT-Codex / Gemini / local
- **neutral I/O contract** — LLM results are JSON validated against our Zod/JSON-Schema (the schema layer is the handshake)
- neutral prompt templates in `prompts/`
- swap or **mix** providers by task; cross-check high-stakes recommendations
- **graceful degradation** — no provider → deterministic defaults + human answers still run

**Grounding caution:** LLM knowledge of provider specifics (pricing, SCIM support, limits) goes stale/hallucinated. Factual gap-filling must be search-grounded/cited or human-verified before entering a decision — especially anything client-facing.

---

## 11. Engagement Contexts & Business Model

**Defaults by context** = an engagement context that sets the decision tiers:
- `self` / `avani-internal` → house presets, dials drop to **Auto**, skip the interview, ship. (Also dogfoods + feeds the learning loop.)
- `client` → full interview, Propose/Ask live, cost + quote output.

One engine, two economic modes: **internal accelerator** *and* **client product**.

**The funnel (market standard = paid discovery):**

| Stage | Price | Engine fidelity | Deliverable |
|---|---|---|---|
| Pre-engagement qualifier | Free | shallow calibrate | Directional read: profile, rough scope, ballpark cost/timeline range, feasibility. Signals competence, qualifies. |
| Discovery / architecture sprint | **Paid** (credited to build) | full interview | Architecture overview + roadmap + fixed-price quote + risk — *the paid product*. |
| Build | Paid project | generate + execution | The codified project; deep moat deployed. |

**IP protection (the "don't give it away" problem):**
1. **Charge for discovery** — walking away isn't free extraction; fee credits toward build.
2. **Give the WHAT, not the HOW** — overview shows decisions + roadmap (the menu); plugins/invariants/calibration/CDK stay gated (the kitchen).
3. **The architecture shape is semi-fungible anyway** — the real moat is velocity, consistency, and accumulated calibration data, which can't be taken. Price the *synthesis for this client*, not a hideable diagram.
4. **Progressive disclosure by stage** — ranges → blueprint → code, unlocked by commitment.

**Leverage:** the engine makes paid discovery cheap to produce (minutes vs. days), turning the stage most consultancies lose money on into a profitable, scalable funnel that also feeds the learning loop.

**Cautions:** a human reviews any client-facing quote (strongest Ask-tier + review-gate case); keep the free tier genuinely thin (competence signals, not the blueprint).

---

## 12. Roadmap

Built so far: schema/contracts, selection map (DAG + graph viz), calibration (intake→context), generate (config→files), plugins (avani-core stub, avani-typescript, avani-python), end-to-end golden pipeline.

| Phase | Piece | Depends on |
|---|---|---|
| **A** | **Standards content** — author `avani-core` accessibility + engineering-discipline skills; `avani-nextjs` forms skill (library-agnostic); a11y invariant | existing plugins |
| **B** | **Design-token layer** — versioned tokens.json (+ light/dark) → CSS vars; component-scaffold skill wired to tokens + headless primitive | A |
| **C** | **Decision dials expansion** — add `framework`(+support tiers), `api_style`, `auth_provider`, `realtime`, `data_store`, `deploy_target`+`iac`, `component_behavior`, `scale_horizon` to calibration + selection | selection layer |
| **D** | **Constraint graph + resolver** — model requires/excludes/influences between dials; conflict detection; derive interview flow from the graph | C |
| **E** | **Decision tiers** — auto/propose/ask on every dial; human-review surfacing | D |
| **F** | **Structured interview** — question catalog by decision area (affects/default/rationale/tier); replace stub intake; free-text → dials | D, E |
| **G** | **Cost/TCO model** — derive infra + monthly + maintenance from resolved dials; client-facing cost output | C |
| **H** | **Roadmap generation** — `ROADMAP.md` output phased by provision phase-hints + mitigations + timeline | generate layer |
| **I** | **LLM Provider interface** — adapters, neutral schema I/O, grounding/verification, graceful degradation | schema layer |
| **J** | **Engagement contexts + funnel outputs** — self/internal/client presets; qualifier assessment; discovery deliverable + quote overview (WHAT-not-HOW) | E, F, G |
| **K** | **Handoff-boundary signaling** — detect + state where the human takes over | C, G |
| **L** | **Learning loop** — decisions.jsonl + `retro`; override-rate metric feeding dials/interview | F |
| **M** | **AWS/CDK deep support** — `avani-aws-cdk` plugin + blueprint + pipeline (harvest-driven) | C |

Suggested near-term order: **A → B** (fills the standards/UI gap with real content), **C → D → E → F** (the decision/interview core — the moat), then **G/H/I** (cost, roadmap, LLM), then **J/K/L** (business + compounding).

---

*Keep this doc alive — append as the thinking evolves; promote settled pieces into SPEC.md + code.*
