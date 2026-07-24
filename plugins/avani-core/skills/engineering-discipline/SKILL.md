---
name: engineering-discipline
description: Apply the Avani engineering discipline — which test tier a test belongs in, what may be mocked, how to respond to a failing test, git hygiene, and the definition of done.
when_to_use: When writing or placing tests, deciding what to mock, tempted to change a failing test's assertion, structuring work into commits, or judging whether a change is done. Especially when a test fails and the fix isn't obvious.
---

# Engineering Discipline

Tests are the control surface: "done when tests pass" is only meaningful if tests pin behavior. These rules keep that true.

## Testing tiers

| Tier | Scope | Mocks |
|---|---|---|
| Unit (majority) | one service, isolated | collaborators mocked via their contracts |
| Integration (the seams) | service + **real** DB | no DB mocks — the DB is the thing you must not fake |
| E2E / Playwright (few) | critical flows, real stack | only third-party edges |

- Test behavior at the contract, not internals — refactors should not churn tests.
- Integration setup migrates a real, ephemeral database from empty (`prisma migrate deploy` or equivalent) — the migration path itself is continuously tested.
- Invariants test at the tier where they live (append-only at the DB tier, fuzzing at the service tier, axe at e2e).

## Mock policy

- Mock only boundaries you own. Wrap third parties (Stripe, Clerk, …) in an adapter and mock the adapter.
- Never mock the thing under test.
- Contract tests keep mocks honest: the same suite runs against the mock and the real implementation.

## Fix the code, not the test

A failing test is an instruction with a reproduction attached. **Never make a test green by weakening its assertion.** If an assertion is genuinely wrong, changing it is a declared decision — say so explicitly in the commit message and PR, never fold it into a "fix".

## Git workflow

- Small, coherent commits in imperative mood; each commit leaves the suite green.
- Never commit secrets, `.env` files, or credentials — no exceptions, including examples with real-looking values.
- Never force-push shared branches; never rewrite published history.
- A service, its interface, its unit tests, and its mock are one unit of work — a service isn't done without its tests.

## Definition of done

1. Typecheck and lint pass.
2. Tests for the changed behavior exist and pass at the right tier.
3. No invariant test was weakened or skipped.
4. The diff contains only what the task needed.
