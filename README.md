# Avani Calibration Engine

Transforms an **application spec** into a calibrated Claude Code setup: universal and context-selected plugins, plus a thin layer of project-specific artifacts (`CLAUDE.md`, settings/hooks, invariant tests, `.mcp.json`).

**Status:** pre-implementation. The design is settled in [SPEC.md](./SPEC.md) (v0.5); engine logic is not written yet.

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

## Roadmap

Phase 0 (harvest `avani-core` + language plugins from shipped apps) → Phase 1 (Tier 2 stack/domain plugins + blueprints) → Phase 2 (engine) → Phase 3 (learning loop). See SPEC.md §10.
