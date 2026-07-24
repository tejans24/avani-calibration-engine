# Avani Calibration Engine

Transforms an **application spec** into a calibrated Claude Code setup: universal and context-selected plugins, plus a thin layer of project-specific artifacts (`CLAUDE.md`, settings/hooks, invariant tests, `.mcp.json`).

**Status:** pre-implementation. Engine mechanics are specified in [SPEC.md](./SPEC.md) (v0.5); the broader decision-architecture, standards model, LLM strategy, business model, and build roadmap are in [VISION.md](./VISION.md).

This repo is the **engine**, the **plugin marketplace**, and the **blueprint library**:

```
.claude-plugin/marketplace.json   marketplace manifest
plugins/avani-core/               Tier 1 — universal, language-agnostic, always enabled
plugins/avani-typescript/         Tier 2 language plugin (TS strict, Zod-at-the-boundary)
plugins/avani-python/             Tier 2 language plugin (uv, ruff, pytest, FastAPI)
templates/                        blueprints — operational files stamped into projects
engine/                           calibration pipeline (intake → calibrate → select → generate)
schemas/                          JSON Schema contracts between pipeline layers
examples/                         golden fixtures harvested from shipped apps
```

## Development

```bash
npm install
npm run typecheck        # tsc strict, no emit
npm test                 # vitest
npm run schema:build     # regenerate schemas/*.schema.json + *.md from the Zod source
npm run calibrate -- init  # CLI stub (not implemented yet)
```

## Schema layer (the moat's contract)

The canonical knowledge structures are defined once in Zod (`engine/src/schema/`)
and compiled to portable, vendor-neutral artifacts in `schemas/`:

- `*.schema.json` — JSON Schema (LLM- and tool-consumable, cross-runtime)
- `*.md` — generated docs (every field's `.describe()` text, searchable and reviewable)

One source yields runtime validation, TypeScript types (`z.infer`), JSON Schema, and
docs — so nothing drifts. Documents are versioned (`schemaVersion` + `SCHEMA_VERSION`);
the engine refuses a document whose major version it doesn't support. The committed
JSON Schema is diff-checked against the Zod source in tests, so editing a schema
without rebuilding fails CI.

## Selection layer (dials → options)

`engine/src/selection/` is the `select` engine layer: versioned rules mapping
calibration dials + feature signals to the plugins, blueprints, invariants, and
patterns a project gets. It's a DAG — a provision selected by more than one
condition is *shared* across branches. `npm run selection:build` compiles it to
`selection/`:

- `selection-map.json` — the serialized graph (conditions, provisions, edges, sharing)
- `selection-map.md` — branch → options docs, plus a "shared across branches" table
- `graph.html` — a self-contained interactive explorer: pick a branch to see what it
  turns on; click an option to trace every branch that selects it (fan-in)

`select(ctx)` evaluates the rules for a calibration context; tests pin the
invasive-species fixture's full selection and its shared nodes.

## End-to-end pipeline

`engine/src/pipeline.ts` wires it together: `intake-profile → calibrate → SelectionContext → select → provisions`, assembled into a schema-valid `calibrated-config`.

- `engine/src/calibration/` — `calibrate(intake)` maps intake facts to dials + signals (per-profile modules); `deriveRisk(intake)` produces the risk assessment.
- `runPipeline(intake)` returns `{ context, selection, config }`. Calibration yields the dials/signals, selection yields the invariants/patterns, and the config is *assembled* from both.

Run it:

```bash
npm run calibrate -- calibrate examples/invasive-species/intake-profile.json
npm run calibrate -- calibrate examples/invasive-species/intake-profile.json --json  # just the config
```

The `examples/invasive-species/` fixtures are golden: `intake-profile.json` in →
`selection-context.json` and `calibrated-config.json` out, pinned by tests, so the
whole pipeline is snapshot-verified.

## Generate layer (config → project files)

`engine/src/generate/` turns a calibrated-config + selection into the emitted
project artifacts:

- `.claude/settings.json` — declares the Avani marketplace + selected plugins
  (`enabledPlugins` as `name@avani`), sensitivity-scaled `permissions.deny`, a Stop hook
- `CLAUDE.md` — the thin project layer: dials, stage convention, db commands, enforced invariants, gotchas
- `.mcp.json` — MCP servers matching the stack (postgres for geo, playwright for Next.js)
- `tests/invariants/*.test.ts` — a `test.todo` stub per selected invariant
- `.avani/manifest.json` — engine/schema/selection versions + selection, for reproducibility

```bash
npm run calibrate -- generate examples/invasive-species/intake-profile.json --out ./out
```

`examples/invasive-species/generated/` is the committed golden output, diff-checked
against the generator in tests. (Settings shapes verified against the Claude Code docs;
blueprint file stamping is Phase-1 work — selected blueprints are recorded in the manifest.)

## Roadmap

Phase 0 (harvest `avani-core` + language plugins from shipped apps) → Phase 1 (Tier 2 stack/domain plugins + blueprints) → Phase 2 (engine) → Phase 3 (learning loop). See SPEC.md §10.
