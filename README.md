# Avani Calibration Engine

Transforms an **application spec** into a calibrated Claude Code setup: universal and context-selected plugins, plus a thin layer of project-specific artifacts (`CLAUDE.md`, settings/hooks, invariant tests, `.mcp.json`).

**Status:** pre-implementation. The design is settled in [SPEC.md](./SPEC.md) (v0.3); engine logic is not written yet.

This repo is both the **engine** and the **plugin marketplace**:

```
.claude-plugin/marketplace.json   marketplace manifest
plugins/avani-core/               Tier 1 plugin — universal, always enabled
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

Phase 0 (harvest `avani-core` from shipped apps) → Phase 1 (Tier 2 stack/domain plugins) → Phase 2 (engine) → Phase 3 (learning loop). See SPEC.md §8.
