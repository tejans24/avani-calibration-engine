---
name: walkthrough
description: Keep every user flow in the project's flow registry in plain words, and walk a human through all of them in the real app on realistic data, with a guide panel that has them check each step, try to break each flow, and note anything else. Then turn their review into fixes or roadmap tasks.
when_to_use: When building or changing a page or user-facing flow, when someone asks to review, demo, test-drive or sign off on what was built, before a launch or a handoff, or when a reviewer's walkthrough review comes back.
---

# Walkthrough Discipline

A human should never have to guess what was built or how to try it. Every flow a person can take through the app is written down once, in the project's **flow registry**, in words for the reviewer, not the developer. The reviewer then walks those flows **in the real app, on realistic data**. A guide panel tells them what to do and what should happen, and asks them to try to break each flow. Screenshots can show that a flow exists. Only the real screens show what it feels like, and that is where reviewers find the edge cases and UX nobody planned for.

In a stamped `ts-nextjs-prisma` project:

| | |
|---|---|
| Registry | `src/flows/flows.ts` |
| Live walkthrough | `npm run walkthrough`: real app, dev seed, guide panel. The review is saved to `walkthrough/review.md` |
| Screenshot version | `npm run walkthrough:shots` writes `walkthrough/index.html`, also uploaded by CI as the `walkthrough` artifact |

## Registering flows

- **Same change.** A new page or flow goes into the registry in the change that builds it. The registry's unit test fails when a page is in no flow. Never satisfy it with a flow that only opens the page: walk what a person does there.
- **Write for the reviewer.** Each flow says who takes it and why it matters. Each step says what to do (`tell`) and what should happen (`see`). Use the words on screen ("Press "Add note""), not code names. If you can't describe what the reviewer should see, the step isn't designed yet.
- **Give them things to break (`tryThis`).** Every flow lists what a hurried, careless or curious person might do: double submit, very long or odd input, back button, reload mid-way, keyboard only, the wrong role, nothing to show yet. These are prompts, not a script. The reviewer will find more.
- **Cover the unhappy paths.** A mistake, an empty state, not allowed. These are separate flows.
- **Keep the whole-app tour a story.** The registry's tour puts every flow in exactly one chapter, in the order a real person would meet them. Each chapter says who the reviewer is (role and situation) and what they're trying to do, and the tour ends with open questions about the app as a whole. A new flow goes where it happens in that story, not at the end. The test fails if a flow is in no chapter.
- **Checks keep it honest.** Give a step a `check` (text that must be on screen) whenever its outcome is visible. The automated run fails a flow that breaks rather than skipping it.

## Realistic data

The walkthrough runs on the dev seed, so the seed has to look like real use. A reviewer who sees lorem ipsum or three tidy rows stops reading the content and misses real problems.

- **Domain text from committed pools, written once** when the real domain replaces the exemplar: titles paired with bodies that belong to them, in the domain's own voice. Faker can't write these.
- **Faker for generic slots only** (names, companies, places, dates, amounts), seeded so every run is identical, and one value per slot per record so a name stays the same within it.
- **Real shape:** realistic volume, uneven spread across categories and users, dates over months with most activity recent, and roughly one record in ten an edge case (very long, odd characters, nearly empty).
- **Check it like a reviewer would.** Read twenty seeded rows. If anything reads as generated, fix the pool.
- If a flow needs a particular state (an overdue item, a full list, a first-time user), add it to a scenario. Never ask the reviewer to set it up by hand.
- Faker stays in development dependencies and under `db/`, never in app code, and the dev seed stays blocked outside dev.

## How much walkthrough

The engine's `walkthrough` dial decides it per project: `off` (no UI, or a prototype), `screenshots` (flow registry and the screenshot page, for internal tools), `live` (plus the guided tour, for anything customers or clients use). Follow the level the project was stamped with, which `CLAUDE.md` names. Don't add a live tour to an internal tool, and don't drop the flow registry from anything with screens.

## Walking a human through

1. Run the automated version first (`walkthrough:shots`). Every flow must run end to end, and you must **read the screenshots**, before a human sees it. A broken or ugly flow is yours to fix, not theirs to find.
2. Start the live walkthrough for them, or tell them the one command. Say how many flows there are, which ones are new since the last review, and how long it should take.
3. For a launch, handoff, or "is it ready?", they take the **whole-app tour**: every chapter in order, then free exploration and "How did the whole app feel?". To check something just built, they use **one feature**. They work through the flows in the real app. For each step they mark "Works" or "Something's off" with a note. After each flow they try to break it and write what they found. "Noticed something else?" records a note against whatever page they're on.
4. Their review lands in `walkthrough/review.md` as they go. On a deployed staging app it can't be saved to disk, so they use "Copy my review" and paste it to you.

## Acting on a review

- Read `walkthrough/review.md`. Read the overall impressions first: they are where missing features and confusing journeys show up, and each one becomes a roadmap task or a question for the owner. Each other item becomes either a fix in this change (a bug in what was just built) or a roadmap task with the reviewer's words as its acceptance criteria. Never drop one silently.
- An edge case they found becomes a test at the right tier and, if it is a thing people will keep doing, a new `tryThis` line or flow, so the next reviewer checks it too.
- Taste calls (wording, layout, what to show first) are the owner's. Propose a change, attach a screenshot, and wait.
- After fixing, tell the reviewer which steps changed so they re-check only what moved.
