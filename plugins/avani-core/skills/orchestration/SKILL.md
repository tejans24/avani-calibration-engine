---
name: orchestration
description: Run multi-agent work the Avani way — single worker by default, fan out only on disjoint file ownership, keystone changes first by the orchestrator, dispatch prompts with explicit scope and handcuffs, and never trusting an agent's report without re-running its verification.
when_to_use: When splitting a task across subagents or parallel sessions, writing a dispatch prompt for a worker agent, integrating agent output, deciding whether a task should fan out at all, or babysitting a PR built by agents.
---

# Orchestration Discipline

A single worker is the **default**; orchestration must justify itself — coordination overhead is real. Fan out only for structural parallelism (N genuinely independent files/services) or independent-perspective verification. Use the platform's native orchestration (subagents, background tasks); never build a bespoke orchestrator.

## Keystone first

Anything that every stream depends on — the database schema, the lockfile/deps, shared config, root wiring — is done **inline by the orchestrator, before agents launch**. One schema migration per wave, owned by the orchestrator, so no parallel stream ever touches the schema.

## File ownership is the conflict map

Before dispatching, assign every hot file exactly one owner for the wave: the schema, the root router/composition file, app entry/wiring, `package.json`, and the shared docs. Everything else parallelizes naturally (a service + its tests, one page folder per agent). An agent's prompt names the files it owns *and* the shared files it must not touch.

## The dispatch prompt

Every agent prompt contains, explicitly:

- **Context pointers** — the project docs to read, and the specific reference files whose style to mirror (a service, a router, a test, a page).
- **Exact scope with decisions pre-made** (schemas, semantics, naming) and explicit **non-goals** — what not to build.
- **File ownership** — files it owns, shared files it must not touch, which sibling streams run concurrently.
- **Verification bar** — the exact commands to run (single-run, not watch mode), the expected results, and any pre-existing-failure baseline (verify every error is in an untouched file).
- **Handcuffs** — do NOT commit, push, install dependencies, or touch schema/lockfile. The orchestrator owns git and deps.
- **Report format** — files changed, verification results with counts, decisions/deviations worth logging. Agents deviate loudly, never silently.

## Integration: trust nothing that didn't run

- The orchestrator **re-runs the agent's verification itself** on the quiet tree before committing — agents have reported green from mid-edit races.
- Commit per item, never one mega-commit; push as you integrate.
- Deviations agents flag get judged at integration, not rubber-stamped.
- Anything that would remove visible functionality is asked about before it ships, not reported after.
