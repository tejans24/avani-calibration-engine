import { describe, expect, test } from 'vitest';
import { walkthroughProblem } from '@/lib/walkthrough';
import { FLOWS } from './flows';
import { emptyReview, progress, reviewMarkdown, stepKey } from './review';

describe('walkthrough review', () => {
  test('an untouched review checks nothing and has nothing to fix', () => {
    const review = emptyReview();
    expect(progress(FLOWS, review)).toMatchObject({ checked: 0, off: 0 });
    expect(reviewMarkdown(FLOWS, review)).toContain('Nothing to fix so far.');
  });

  test('lists only what is off, what was found, and anything else noticed', () => {
    const flow = FLOWS[0]!;
    const review = {
      marks: { [stepKey(flow.id, 1)]: { verdict: 'works' as const }, [stepKey(flow.id, 2)]: { verdict: 'off' as const, note: 'label is unclear' } },
      found: { [flow.id]: 'double submit adds two notes' },
      extra: [{ path: '/', note: 'header overlaps on phones' }],
    };
    const md = reviewMarkdown(FLOWS, review);
    expect(progress(FLOWS, review)).toMatchObject({ checked: 2, off: 1 });
    expect(md).toContain(`## ${flow.title}`);
    expect(md).toContain('Step 2 (Type a title.) is off: label is unclear');
    expect(md).toContain('Trying to break it: double submit adds two notes');
    expect(md).toContain('On /: header overlaps on phones');
    expect(md).not.toContain('Step 1');
  });

  test('every flow gives the reviewer something to try breaking', () => {
    for (const flow of FLOWS) expect(flow.tryThis.length, flow.id).toBeGreaterThan(0);
  });
});

describe('walkthroughProblem', () => {
  test('on only when asked for, in dev or staging', () => {
    expect(walkthroughProblem({ WALKTHROUGH: 'on', AVANI_STAGE: 'dev' })).toBeNull();
    expect(walkthroughProblem({ WALKTHROUGH: 'on', AVANI_STAGE: 'staging' })).toBeNull();
  });

  test('fails closed: off by default, never in production, never without a stage', () => {
    expect(walkthroughProblem({ AVANI_STAGE: 'dev' })).not.toBeNull();
    expect(walkthroughProblem({ WALKTHROUGH: 'on', AVANI_STAGE: 'production' })).not.toBeNull();
    expect(walkthroughProblem({ WALKTHROUGH: 'on' })).not.toBeNull();
  });
});
