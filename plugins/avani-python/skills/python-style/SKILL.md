---
name: python-style
description: Write Python to the Avani conventions — uv, ruff, pytest, FastAPI service layout, Pydantic-at-the-boundary.
when_to_use: When writing or reviewing any Python in this project — FastAPI services, ML workflows, data pipelines. TypeScript files follow avani-typescript conventions instead.
---

# Avani Python Style

## Tooling

- **uv** manages the environment and dependencies: `uv add`, `uv run`, `uv sync`. Never pip-install into a bare interpreter; every app owns its `pyproject.toml`.
- **ruff** is both formatter and linter (`uv run ruff format`, `uv run ruff check --fix`). No black/isort/flake8 alongside it.
- **pytest** for tests; test files mirror the source layout under `tests/`.

## Types & boundaries

- Type hints on all public functions; run pyright/mypy in CI when configured.
- Validate external data at the boundary with **Pydantic** models — the Python mirror of the Zod-at-the-boundary rule on the TS side. Internal code trusts validated models, never raw dicts.
- FastAPI request/response models are Pydantic; the generated OpenAPI spec is the contract consumed by the TypeScript client in `packages/shared` — keep response models accurate, they are the cross-language source of truth.

## Structure (FastAPI services)

```
app/
├── main.py          app factory + router registration only
├── routers/         thin HTTP layer
├── services/        business logic (no FastAPI imports)
├── models/          Pydantic schemas
└── db/              persistence
tests/
```

- Routers stay thin; logic lives in `services/` so it's testable without HTTP.
- Keep modules under ~300 lines; split by responsibility before they grow past that.

## Naming

`snake_case` for modules/functions/variables, `PascalCase` for classes and Pydantic models, `SCREAMING_SNAKE_CASE` for constants.
