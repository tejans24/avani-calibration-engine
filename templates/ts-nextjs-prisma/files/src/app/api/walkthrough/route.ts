import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { FLOWS } from '@/flows/flows';
import { reviewMarkdown, type Review } from '@/flows/review';
import { walkthroughProblem } from '@/lib/walkthrough';

const ReviewSchema = z.object({
  marks: z.record(z.string(), z.object({ verdict: z.enum(['works', 'off']).optional(), note: z.string().max(5000).optional() })),
  found: z.record(z.string(), z.string().max(5000)),
  extra: z.array(z.object({ path: z.string().max(500), note: z.string().max(5000) })).max(200),
});

// Saves the reviewer's walkthrough to walkthrough/review.md (+ .json) so the
// builder (human or Claude) reads it straight from the repo. Where the disk is
// read-only (a deployed staging app) it answers saved: false and the panel
// falls back to "Copy my review".
export async function POST(request: Request): Promise<Response> {
  if (walkthroughProblem()) return new Response('Not found', { status: 404 });
  const parsed = ReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ saved: false, error: 'invalid review' }, { status: 400 });
  const review: Review = parsed.data;
  try {
    const dir = join(process.cwd(), 'walkthrough');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'review.md'), reviewMarkdown(FLOWS, review));
    await writeFile(join(dir, 'review.json'), `${JSON.stringify(review, null, 2)}\n`);
    return Response.json({ saved: true });
  } catch {
    return Response.json({ saved: false });
  }
}
