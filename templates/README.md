# Blueprints

Blueprints are the engine's third knowledge type (SPEC.md §3): deterministic file templates stamped into a generated project by `calibrate generate`, selected by the same dials that select plugins.

Plugins define how Claude *behaves* (skills, hooks); blueprints define what gets *stamped into the repo* — the operational machinery plugins cannot provide: `package.json` scripts, GitHub Actions workflows, workspace layout.

## Blueprints

| Blueprint | Status | Selected when | Stamps |
|---|---|---|---|
| `ts-nextjs-prisma/` | **built** | `runtime = ts-nextjs` | runnable Next.js + Prisma skeleton: app structure, schema + initial migration, stage-guarded db scripts, deterministic seeds (factories → scenarios → env seeds), exemplar service + 3 test tiers, CI ladder |
| `python-fastapi/` | planned | `runtime = python` | `pyproject.toml` (uv), ruff + pytest config, service skeleton, CI workflow |
| `monorepo-root/` | planned | `topology = monorepo` | npm-workspaces root, `apps/` + `packages/shared` layout, root CLAUDE.md skeleton |

## Template mechanics

A blueprint's stampable tree lives in `<blueprint>/files/` and is copied verbatim by
`engine/src/generate/blueprints.ts`, with two mechanics:

- **Renames** — files that can't be committed under their real names (`gitignore` → `.gitignore`,
  because a real `.gitignore` would change this repo's git behavior; `env.example` → `.env.example`,
  because the root `.gitignore` excludes `.env.*`).
- **Substitution** — `{{APP_NAME}}` is replaced with the project name everywhere.

Stamping is deterministic: same template + same name → byte-identical output, so generated
projects are golden-testable.

Every blueprint with a procedure has a paired skill in the corresponding plugin (e.g. `ts-nextjs-prisma` ↔ `avani-nextjs:db-migrations`): the blueprint gives every project identical commands, the skill makes Claude follow identical procedure when using them.
