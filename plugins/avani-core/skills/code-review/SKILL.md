---
name: code-review
description: Review code the Avani way — verify claims against reality instead of reading for plausibility, inventory what was authored but never executed, and rank findings by what actually breaks.
when_to_use: When reviewing a PR or diff, re-reviewing your own work before pushing, judging agent-produced changes before integrating them, or deciding whether a change is safe to merge.
---

# Code Review Discipline

Plausible-looking code is the failure mode. A review's job is to find where the code's *claims* diverge from what will actually happen — so verify, don't vibe.

## Verify claims against reality

For each claim the diff makes, check the mechanism that makes it true:

- **A guard or check exists** → trace how it's armed. Is the config it reads actually loaded in every entrypoint that hits the guard? (The classic: a script reads env vars but never loads `.env`, so the guard sees nothing.)
- **A command or script** → will it run where it's meant to? Chained commands (`a && b`) inside tool config hooks are platform-dependent; paths and flags differ across majors.
- **CI/workflow changes** → do the triggers reference branches, secrets, and services that exist in *this* repo, not an idealized one?
- **A fallback or default** → what happens when every signal is absent? Defaults that fail open on destructive paths are findings, not style points.
- **Docs/skill text** → is every statement true of the code as it now is? Prose that contradicts the repo is drift being born.

## Inventory what never ran

List what the change *authored but never executed* — the integration path with no local runtime, the workflow that first fires after merge, the branch of the conditional no test reaches. Untested-by-construction is not a blocker, but it must be named in the review so the first live run is watched, not trusted.

## Adversarial pass on your own work

Review your own diff as a hostile reader before pushing: hunt for the claim you *believe* rather than checked. The bugs a self-review finds are concentrated where you were most confident. Verifying a fix means reproducing the failure first — a test that passes both before and after proves nothing.

## Findings

- Rank by consequence: what breaks, for whom, how loudly. Bugs before risks, risks before nits.
- Every finding states the failure scenario — concrete inputs/state → wrong outcome. "This looks wrong" is not a finding.
- Separate "fix before merge" (the change makes a false claim, or breaks a real path) from "tracked follow-up" (real but not made worse by merging).
- End with what's solid — the review is also the record of what was checked and can be trusted.
