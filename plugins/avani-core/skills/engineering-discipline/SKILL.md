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
- When test files run in parallel against **one shared database**, scope every fixture and assertion to data that test created (a per-test tenant/workspace row). Never wipe globally (`deleteMany()` with no scope) — it deletes a sibling test's data mid-run and the flake is unattributable.
- Test-runner transforms can mask module-system bugs: a CJS/ESM import that crashes the real process on boot can pass under vitest. For any change touching process startup or adding a dependency, boot the real thing once.

## Mock policy

- Mock only boundaries you own. Wrap third parties (Stripe, Clerk, …) in an adapter and mock the adapter.
- Never mock the thing under test.
- Contract tests keep mocks honest: the same suite runs against the mock and the real implementation.
- Tests are hermetic: anything that would call out to the real world (price feeds, third-party APIs, background syncs) is disabled in the test config via an explicit kill-switch env var. A test that needs the behavior injects a fake and flips the switch locally.

## Determinism & flakes

- Concurrency tests **signal, never sleep**: the code under test resolves a promise when it reaches the asserted state, and resources are released in `finally`. A sleep is a race against the scheduler.
- Outside-world effects (clocks, `fetch`, mail, LLM calls) are **injectable, defaulting real**; tests inject fakes, and no test does live network I/O. Time-gated logic takes a `now: Date` parameter — test fixed instants, including DST boundaries.
- Reproduce a flake in isolation before blaming your change; rerun once and accept only green. A recurring flake gets a root-cause fix (almost always fixture scoping or signaling), never a retry loop or a skip.
- Classify failures before fixing: a worker crash with zero test failures is infrastructure; an FK violation or wrong value is code.

## What earns a test

- Service functions: the happy path, an authorization failure, and the boundary the code claims to enforce.
- Every regression found in review or production: a test named for the scenario, written before the fix.

## Fix the code, not the test

A failing test is an instruction with a reproduction attached. **Never make a test green by weakening its assertion.** If an assertion is genuinely wrong, changing it is a declared decision — say so explicitly in the commit message and PR, never fold it into a "fix".

## Git workflow

- Small, coherent commits in imperative mood; each commit leaves the suite green.
- Commit messages explain **why** (the constraint, the trade-off) — the diff already shows what.
- Never commit secrets, `.env` files, or credentials — no exceptions, including examples with real-looking values.
- Never force-push shared branches; never rewrite published history.
- A service, its interface, its unit tests, and its mock are one unit of work — a service isn't done without its tests.

## Secrets & credentials at runtime

- Third-party credentials and access tokens are encrypted at rest, never selected into API responses, and never logged. Record provider errors as codes, not payloads — a payload can carry the token.

## Untrusted data at the edges

- Every value interpolated into generated HTML (email bodies, notifications, exports) is escaped **at the point of interpolation**, regardless of where it came from — "it's from our own DB" is not a trust argument.
- CSV/spreadsheet exports prefix any cell starting with `=`, `+`, `-`, or `@` with `'` — spreadsheet formula injection runs when the file is opened, not when it's written.

## Configuration & degradation

- Every optional integration degrades quietly when its configuration is unset: the feature stays off, nothing crashes, no scary logs. Unset key → dormant feature is the contract.
- A new env var ships with its full plumbing in the same change: the example env file, the CI/deploy secret sync, and the docs row. The owner's only manual step should be pasting the value into the secret store.

## Definition of done

1. Typecheck and lint pass.
2. Tests for the changed behavior exist and pass at the right tier.
3. No invariant test was weakened or skipped.
4. The diff contains only what the task needed.
5. Nothing visible was removed silently — removing functionality is a decision to surface *before* shipping, never a side effect.
6. Before extending existing code, its real usage was checked (`grep` for call sites) — codebases grow orphaned components; don't build on dead code.
