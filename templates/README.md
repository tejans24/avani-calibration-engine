# Blueprints

Blueprints are the engine's third knowledge type (SPEC.md §3): deterministic file templates stamped into a generated project by `calibrate generate`, selected by the same dials that select plugins.

Plugins define how Claude *behaves* (skills, hooks); blueprints define what gets *stamped into the repo* — the operational machinery plugins cannot provide: `package.json` scripts, GitHub Actions workflows, workspace layout.

## Planned blueprints (Phase 1 — templates authored from shipped apps)

| Blueprint | Selected when | Stamps |
|---|---|---|
| `ts-nextjs-prisma/` | `runtime = ts-nextjs` | npm scripts (`db:migrate:dev`, `db:migrate:deploy`, `db:reset`, `db:seed`, `db:studio`), `ci.yml`, `deploy.yml` with `prisma migrate deploy` as a release step |
| `python-fastapi/` | `runtime = python` | `pyproject.toml` (uv), ruff + pytest config, service skeleton, CI workflow |
| `monorepo-root/` | `topology = monorepo` | npm-workspaces root, `apps/` + `packages/shared` layout, root CLAUDE.md skeleton |

Every blueprint with a procedure has a paired skill in the corresponding plugin (e.g. `ts-nextjs-prisma` ↔ `avani-nextjs:db-migrations`): the blueprint gives every project identical commands, the skill makes Claude follow identical procedure when using them.
