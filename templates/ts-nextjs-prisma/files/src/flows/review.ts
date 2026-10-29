import type { Flow } from './flows';

/**
 * A reviewer's walkthrough, as kept by the live walkthrough panel and written
 * to walkthrough/review.md. Pure, so the panel, the API route and the unit
 * tier share one shape and one markdown rendering.
 */
export type Verdict = 'works' | 'off';

export interface Review {
  /** Keyed `flowId:stepNumber` (1-based). */
  marks: Record<string, { verdict?: Verdict; note?: string }>;
  /** What the reviewer found while trying to break each flow, keyed by flow id. */
  found: Record<string, string>;
  /** Anything else, noted wherever they were in the app. */
  extra: { path: string; note: string }[];
}

export const emptyReview = (): Review => ({ marks: {}, found: {}, extra: [] });

export const stepKey = (flowId: string, step: number) => `${flowId}:${step}`;

export function progress(flows: readonly Flow[], review: Review): { checked: number; total: number; off: number } {
  const keys = flows.flatMap((f) => f.steps.map((_, i) => stepKey(f.id, i + 1)));
  return {
    checked: keys.filter((k) => review.marks[k]?.verdict).length,
    total: keys.length,
    off: keys.filter((k) => review.marks[k]?.verdict === 'off').length,
  };
}

/** The review as a markdown list of what needs attention, flow by flow. */
export function reviewMarkdown(flows: readonly Flow[], review: Review): string {
  const { checked, total, off } = progress(flows, review);
  const lines = [`# Walkthrough review`, '', `${checked} of ${total} steps checked, ${off} off.`, ''];
  for (const flow of flows) {
    const items = flow.steps.flatMap((step, i) => {
      const mark = review.marks[stepKey(flow.id, i + 1)];
      return mark?.verdict === 'off' ? [`- Step ${i + 1} (${step.tell}) is off${mark.note?.trim() ? `: ${mark.note.trim()}` : ''}`] : [];
    });
    const found = review.found[flow.id]?.trim();
    if (found) items.push(`- Trying to break it: ${found}`);
    if (items.length) lines.push(`## ${flow.title}`, '', ...items, '');
  }
  const extra = review.extra.filter((e) => e.note.trim());
  if (extra.length) lines.push('## Also noticed', '', ...extra.map((e) => `- On ${e.path}: ${e.note.trim()}`), '');
  if (!off && !extra.length && !Object.values(review.found).some((f) => f.trim())) lines.push('Nothing to fix so far.', '');
  return lines.join('\n');
}
