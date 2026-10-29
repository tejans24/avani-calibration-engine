---
name: walkthrough
description: Keep every user flow in the project's flow registry in plain words, and walk a human through all of them with a generated, screenshot-per-step review page — then turn what they mark "off" into fixes or roadmap tasks.
when_to_use: When building or changing a page or user-facing flow, when someone asks to review, demo, test-drive or sign off on what was built, before a launch or a handoff, or when a reviewer sends back a walkthrough review.
---

# Walkthrough Discipline

A human should never have to guess what was built or how to try it. Every flow a person can take through the app is written down once, in the project's **flow registry**, in words for the reviewer, not the developer. The registry drives a browser through each flow, screenshots every step, and builds one review page the human clicks through.

In a stamped `ts-nextjs-prisma` project: the registry is `src/flows/flows.ts`, the command is `npm run walkthrough`, and the page is `walkthrough/index.html` (CI uploads it as the `walkthrough` artifact on every run).

## Registering flows

- **Same change.** A new page or flow goes into the registry in the change that builds it. The registry's unit test fails when a page is in no flow. Never satisfy it with a flow that only opens the page: walk what a person does there.
- **Write for the reviewer.** Each flow says who takes it and why it matters. Each step says what to do (`tell`) and what should happen (`see`). Use the words on screen ("Press "Add note""), not code names. If you can't describe what the reviewer should see, the step isn't designed yet.
- **Cover the unhappy paths.** An empty form, a mistake, nothing to show yet, not allowed. These are separate flows, because they are where reviewers find problems.
- **Checks keep it honest.** Give a step a `check` (text that must be on screen) whenever its outcome is visible. A flow that breaks fails the run and the review page shows the step where it broke. It is never quietly skipped.

## Walking a human through

1. Run the walkthrough yourself first. Every flow must run end to end before a human sees it. A broken flow is yours to fix, not theirs to find.
2. **Read the screenshots** before you send them. A flow that runs green can still look wrong (an overlapping layout, a confusing empty state, raw error text).
3. Send the one file (or the CI artifact link) with one line: how many flows there are and which ones are new since the last review.
4. The reviewer marks each step "Works" or "Something's off", adds a note, and presses "Copy my review". Their review comes back as a list of steps that are off.

## Acting on a review

- Each "off" item becomes either a fix in this change (it's a bug in what was just built) or a roadmap task with the reviewer's words as its acceptance criteria. Never drop one silently.
- Taste calls (wording, layout, what to show first) are the owner's. Propose, attach the screenshot, and wait.
- After fixing, re-run the walkthrough and send the new page, naming which steps changed. A reviewer re-checks only what moved.
