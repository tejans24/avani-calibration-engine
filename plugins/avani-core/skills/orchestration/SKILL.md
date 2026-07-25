---
name: orchestration
description: Run multi-agent work the Avani way — single worker by default, fan out only on disjoint file ownership, keystone changes first by the orchestrator, dispatch prompts with explicit scope and handcuffs, and never trusting an agent's report without re-running its verification.
when_to_use: When splitting a task across subagents or parallel sessions, writing a dispatch prompt for a worker agent, integrating agent output, deciding whether a task should fan out at all, or babysitting a PR built by agents.
---

# Orchestration Discipline

A single worker is the **default**; orchestration must justify itself — coordination overhead is real. Fan out only for structural parallelism (N genuinely independent files/services) or independent-perspective verification. Use the platform's native orchestration (subagents, background tasks); never build a bespoke orchestrator.

## Keystone first

Anything that every stream depends on — the database schema, the lockfile/deps, shared config, root wiring — is done **inline by the orchestrator, before agents launch**. One schema migration per wave, owned by the orchestrator, so no parallel stream ever touches the schema.

Before dispatching, verify the environment yourself (database up, dependencies installed) — and never pipe a setup command's output (`npm install | tail`): the pipe masks the exit code, and a failed install resurfaces later as nonsense agent failures.

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
- UI work is verified by driving the real app: run it, screenshot, actually *read* the image, iterate — and send taste calls to the owner with the screenshot attached.
- Anything that would remove visible functionality is asked about before it ships, not reported after.

## PR babysitting

- **CI failure triage, in order:** read the actual error → reproduce locally → check whether the clean base branch fails identically. Fix small, confident things with the full verification bar (run the affected tests locally before pushing — never push a guess to see if CI likes it); describe scope-y or repeated failures to the owner instead. Never leave a red check unexplained. Third-party bot noise (preview-deploy comments) is acknowledged, never acted on.
- **Review comments:** real findings get one coherent commit; half-wrong suggestions get the cheap fix if it ends the thread; resolve threads after pushing; push back briefly in-thread only when a suggestion is actually wrong. A comment that would expand scope or change behavior the PR didn't touch is a question for the owner, not a change to make.
- Keep the PR description current after every fix — it is the reviewable record.

## Scaling to parallel waves

Two waves (branch → PR streams) may run concurrently only if **all** hold: they are file-disjoint including the hot files (few-line additions to the same registry file are still a conflict); at most one touches the schema; no dependency edge exists between them; and the governing docs have exactly one owner. Coordination state lives in the roadmap and the open PRs — never in side-channel chatter between sessions; needing something from another wave is a dependency, so stop and escalate.

After **any** merge to the base branch, every open wave rebases and re-runs its full verification — a green PR against a stale base is not green. Scaling adds orchestrators; it never thins the per-wave verification bar. Too many escalations to the owner means too many waves — that's the capacity signal.
