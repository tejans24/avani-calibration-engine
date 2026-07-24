---
name: code-style
description: Write TypeScript to the Avani conventions — strict mode, naming, Zod-at-the-boundary, service-oriented file structure.
when_to_use: When writing or reviewing any TypeScript in this project — new modules, refactors, PR review — or deciding where a new file belongs and what to name it.
---

# Avani Code Style

## TypeScript

- `strict` mode is on and stays on. Never introduce `any`; prefer `unknown` + narrowing.
- Exported functions declare explicit return types.
- `const` over `let`; no `var`.
- Validate external data at the boundary with Zod schemas; infer TS types from schemas (`z.infer`), never duplicate them by hand.

## Naming

| Thing | Convention |
|---|---|
| directories | `kebab-case` |
| React components | `PascalCase` |
| utilities / functions | `camelCase` |
| Zod schemas | `XxxSchema` |

## Structure

- Service-oriented: route handlers stay thin; logic lives in `src/services/`.
- Shared Zod schemas live in `src/schemas/` and are imported by both client and server.
- Keep files under ~300 lines; split by responsibility before they grow past that.

## Comments

Only write a comment to state a constraint the code can't show. No narration of what the next line does.
