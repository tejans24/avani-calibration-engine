/**
 * Every flow a person can take through the app, in the words we would use to
 * walk them through it. One registry, three readers:
 *
 * - tests/e2e/walkthrough.spec.ts drives each flow in a real browser and takes
 *   a screenshot after every step (`npm run walkthrough`);
 * - scripts/walkthrough.ts turns those screenshots into walkthrough/index.html,
 *   a page a human clicks through step by step, marking each one "Works" or
 *   "Something's off" with a note;
 * - flows.test.ts fails when a page exists that no flow visits.
 *
 * Building a flow means adding it here in the same change. Write `tell` and
 * `see` for the person doing the review, not for a developer: what they tap,
 * and what should happen.
 *
 * Pure data — no Playwright import — so the unit tier can read it.
 */

export type FlowAction =
  /** Open a page by its path. */
  | { goto: string }
  /** Type into the field with this label. */
  | { fill: string; with: string }
  /** Press the button or link with this name. */
  | { click: string };

export interface FlowStep {
  action: FlowAction;
  /** What the reviewer does, in plain words. */
  tell: string;
  /** What they should see afterwards. */
  see: string;
  /** Text that must be on screen after the step; the walkthrough fails the flow without it. */
  check?: string;
}

export interface Flow {
  id: string;
  title: string;
  /** Who takes this flow (a role, not a person). */
  who: string;
  /** Why it matters, one line. */
  why: string;
  steps: FlowStep[];
}

export const FLOWS: Flow[] = [
  {
    id: 'add-a-note',
    title: 'Add a note',
    who: 'Anyone using the workspace',
    why: 'The core thing the app does.',
    steps: [
      { action: { goto: '/' }, tell: 'Open the app.', see: 'A "New note" form above a list of notes.', check: 'New note' },
      { action: { fill: 'Title', with: 'Walkthrough note' }, tell: 'Type a title.', see: 'Your title in the Title box.' },
      { action: { fill: 'Body', with: 'Added during the walkthrough' }, tell: 'Type the note itself.', see: 'Your text in the Body box.' },
      {
        action: { click: 'Add note' },
        tell: 'Press "Add note".',
        see: 'The form clears and your note appears in the list.',
        check: 'Walkthrough note',
      },
    ],
  },
  {
    id: 'empty-form',
    title: 'Forget to fill in the form',
    who: 'Anyone using the workspace',
    why: 'Mistakes should be explained, not swallowed.',
    steps: [
      { action: { goto: '/' }, tell: 'Open the app.', see: 'The "New note" form.', check: 'New note' },
      {
        action: { click: 'Add note' },
        tell: 'Press "Add note" without typing anything.',
        see: 'A red message under Title saying it is required. Nothing is added.',
        check: 'Title is required',
      },
    ],
  },
];

/** Every path any flow opens. */
export function visitedPaths(flows: readonly Flow[] = FLOWS): Set<string> {
  return new Set(flows.flatMap((flow) => flow.steps.flatMap((step) => ('goto' in step.action ? [step.action.goto] : []))));
}
