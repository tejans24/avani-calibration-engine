/**
 * Every flow a person can take through the app, in the words we would use to
 * walk them through it, and TOUR: the whole app told as one story, start to
 * finish, in chapters. One registry, several readers:
 *
 * avani:if walkthrough>=live
 * - the live walkthrough (`npm run walkthrough`): the real app on realistic dev
 *   data, with a guide panel. "Tour the whole app" takes a person through
 *   every chapter in order, then lets them explore freely and asks how the
 *   whole thing felt; "Check one feature" runs a single flow. It highlights
 *   what to press, asks them to try to break each flow, and saves their review
 *   to walkthrough/review.md (src/components/walkthrough-panel.tsx);
 * avani:end
 * - tests/e2e/walkthrough.spec.ts drives each flow in a real browser and takes
 *   a screenshot after every step;
 * - scripts/walkthrough.ts turns those screenshots into walkthrough/index.html,
 *   a page in tour order that anyone can click through without running the app
 *   (`npm run walkthrough:shots`, and a CI artifact on every run);
 * - flows.test.ts fails when a page exists that no flow visits, or a flow is
 *   in no chapter of the tour.
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
  /**
   * Edge cases to try once the flow works: what a careless, hurried or curious
   * person might do. The live walkthrough asks the reviewer to try each one.
   */
  tryThis: string[];
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
    tryThis: [
      'Paste a very long title (a whole paragraph). Does the list still look right?',
      'Press "Add note" twice, fast. Do you get one note or two?',
      'Use emoji or accented letters in the title.',
      'Reload the page. Is your note still there?',
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
    tryThis: [
      'Type only spaces in the title, then press "Add note".',
      'Fill in the title but leave the body empty.',
      'Use only the keyboard: Tab to each field and press Enter to submit.',
    ],
  },
];

export interface Chapter {
  title: string;
  /** Who the reviewer is in this chapter (a role and a situation). */
  as: string;
  /** Sets the scene: what they are trying to do, and why, in a sentence or two. */
  story: string;
  /** Flow ids, in the order a real person would hit them. */
  flows: string[];
}

export interface Tour {
  /** Read first: what the reviewer is about to do and how long it takes. */
  intro: string;
  /** The app's whole life story, in order. Every flow belongs to exactly one chapter. */
  chapters: Chapter[];
  /** After the last chapter: questions about the app as a whole. */
  explore: string[];
}

export const TOUR: Tour = {
  intro:
    'You are about to use {{APP_NAME}} start to finish, the way a real person would. Each chapter tells you who you are and what you are trying to do. Do it in the app itself, and say when something works, when it does not, and when it feels wrong. It takes about ten minutes.',
  chapters: [
    {
      title: 'First visit',
      as: 'Someone opening the workspace for the first time',
      story: 'Your team keeps its notes here. You open it to write down something from today.',
      flows: ['add-a-note'],
    },
    {
      title: 'In a hurry',
      as: 'The same person, a few days later, rushing',
      story: 'Between meetings, you go to add a note and press the button before typing anything.',
      flows: ['empty-form'],
    },
  ],
  explore: [
    'Now use the app freely for a few minutes, as you would on a normal day. Go anywhere.',
    'What was confusing, slow, or harder than it should be?',
    'What did you expect to find that is not here?',
    'Would you come back to it tomorrow? Why or why not?',
  ],
};

/** The tour as one ordered list of flows, each with its chapter's index. */
export function tourSequence(tour: Tour = TOUR, flows: readonly Flow[] = FLOWS): { chapter: number; flow: Flow }[] {
  return tour.chapters.flatMap((chapter, i) =>
    chapter.flows.flatMap((id) => {
      const flow = flows.find((f) => f.id === id);
      return flow ? [{ chapter: i, flow }] : [];
    }),
  );
}

/** Every path any flow opens. */
export function visitedPaths(flows: readonly Flow[] = FLOWS): Set<string> {
  return new Set(flows.flatMap((flow) => flow.steps.flatMap((step) => ('goto' in step.action ? [step.action.goto] : []))));
}
