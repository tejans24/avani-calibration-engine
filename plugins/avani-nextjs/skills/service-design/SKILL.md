---
name: service-design
description: Structure business logic as Avani services — explicit typed interface, Zod parse at the boundary, no framework imports, injected collaborators, tests generated with the service.
when_to_use: When adding or changing business logic, creating a service, deciding where new code belongs, wrapping a third-party API, or when a route handler / server action starts growing logic beyond parse-call-map.
---

# Service Design

Route handlers, server actions, and components stay thin; logic lives in `src/services/`. Services are the unit of task decomposition: *implement service X to satisfy contract Y; tests are the acceptance criteria*.

## The service shape

- **Explicit typed interface per service** (`NoteService`), exported next to its implementation.
- **Zod at the boundary:** anything crossing into a service from the outside world (request bodies, form input, third-party responses) is parsed with a schema from `src/schemas/` first. Inside the service, data is already typed and trusted.
- **No framework imports inside services.** Nothing from `next/*`, no `Request`/`Response`, no React. A service is testable without a server and reusable across delivery mechanisms (route handler, server action, CLI, job).
- **Collaborators injected.** A service receives its repository/adapters via constructor or factory args — never imports a live singleton. This is what makes unit-mocking trivial.

## Exemplar layout

```
src/services/notes/
  note-service.ts        # interface + implementation (collaborators injected)
  note-repository.ts     # Prisma-backed repository behind its own interface
  note-service.test.ts   # unit tier: service with mocked repository
tests/integration/
  note-service.integration.test.ts   # service + real DB, migrated from empty
```

The stamped exemplar in the repo is the reference — imitate its structure for every new service.

## A service isn't done without its tests

Generate service + interface + unit test + mock together, in the same change:

- **Unit** — the service with collaborators mocked via their contracts.
- **Integration** — the service against a real database (no DB mocks), migrated from empty so the migration path is exercised.
- Third parties are wrapped in adapters; mock the adapter, and keep a contract test that runs against both mock and real.

## Where code goes

| Code | Home |
|---|---|
| Business rules, orchestration | `src/services/<area>/` |
| Data access | a repository behind an interface, injected into the service |
| Validation shapes | `src/schemas/` (shared with forms) |
| HTTP/RSC wiring | route handler / server action — parse, call service, map result |
| Third-party calls | an adapter with an interface, injected |

If a route handler grows an `if` beyond input parsing and status mapping, the logic belongs in a service.

## Prisma stays server-side

Client code never imports from `@prisma/client` — Prisma's generated types and enums don't survive the client bundle. The shared shapes the client consumes live in `src/schemas/` (`z.infer` types); enums the client needs are plain const objects there, kept in sync with the schema. Repositories are the only Prisma-aware layer.

## Multi-tenant scoping

When the app is multi-tenant (rows belong to an org/workspace/account):

- The tenant is resolved **server-side from the session** by one shared helper — never from a client-sent id, header, or form field.
- **Every** query carries the tenant filter — including the `where` of `update` and `delete` (`where: { id, organizationId }`), not only reads. A bare row id from the client is an insecure direct object reference; the compound `where` makes cross-tenant writes structurally impossible rather than policed by review.
