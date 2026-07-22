# Avani Calibration Engine

Transforms an **application spec** into a calibrated Claude Code setup: universal and context-selected plugins, plus a thin layer of project-specific artifacts (`CLAUDE.md`, settings/hooks, invariant tests, `.mcp.json`).

**Status:** pre-implementation. The design is settled in [SPEC.md](./SPEC.md) (v0.4); engine logic is not written yet.

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
npm run calibrate -- init  # CLI stub (not implemented yet)
```

## Roadmap

Phase 0 (harvest `avani-core` + language plugins from shipped apps) → Phase 1 (Tier 2 stack/domain plugins + blueprints) → Phase 2 (engine) → Phase 3 (learning loop). See SPEC.md §10.
