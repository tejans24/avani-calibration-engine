/**
 * Whether the live walkthrough (guide panel + review saving) is on, and if not,
 * why. On only with WALKTHROUGH=on AND an explicit non-production AVANI_STAGE
 * (dev or staging): it fails closed, so a production deploy never shows it,
 * even with WALKTHROUGH set by mistake. The layout and the API route both ask.
 */
export function walkthroughProblem(env: Record<string, string | undefined> = process.env): string | null {
  if (env['WALKTHROUGH'] !== 'on') return 'WALKTHROUGH is not on';
  const stage = env['AVANI_STAGE'];
  if (stage !== 'dev' && stage !== 'staging') return `walkthrough needs AVANI_STAGE dev or staging (got ${stage ?? 'nothing'})`;
  return null;
}
