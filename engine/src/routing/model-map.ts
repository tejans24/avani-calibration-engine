/**
 * The model map (VISION §13): what kind of work goes to which capability tier,
 * and which model family serves each tier.
 *
 * Three layers, each changing at a different speed:
 *
 * 1. WORK_ROUTES — kind of work -> tier. True about the work, not the models;
 *    changes only when we learn a kind of work needs more (or less) capability.
 * 2. TIERS — tier -> family alias (`opus` | `sonnet` | `haiku`). Claude Code
 *    resolves an alias to the newest model in that family, so a new release
 *    reaches every generated project with no edit here and no regeneration.
 * 3. `current` + REVIEWED_ON — the model each alias resolved to when a human
 *    last looked. Informational only: nothing routes on it. `npm run
 *    models:check` (weekly in CI) compares it to the live Models API and fails
 *    when a newer model ships or the review is older than REVIEW_EVERY_DAYS —
 *    that red run is the prompt to re-check the routes, not just the names.
 */

export const TIER_NAMES = ['frontier', 'standard', 'fast'] as const;
export type Tier = (typeof TIER_NAMES)[number];

/** Families Claude Code accepts as `model:` aliases in settings and agent frontmatter. */
export const FAMILIES = ['opus', 'sonnet', 'haiku'] as const;
export type Family = (typeof FAMILIES)[number];

export type Effort = 'low' | 'medium' | 'high' | 'xhigh';

export interface TierSpec {
  alias: Family;
  /** What this alias resolved to at REVIEWED_ON. Never routed on. */
  current: string;
  use: string;
}

export const TIERS: Record<Tier, TierSpec> = {
  frontier: {
    alias: 'opus',
    current: 'claude-opus-5-5',
    use: 'judgment: architecture, cross-cutting changes, ambiguous requirements, final reviews',
  },
  standard: {
    alias: 'sonnet',
    current: 'claude-sonnet-5-5',
    use: 'standard feature work: a service, a form, a migration, a UX flow pass',
  },
  fast: {
    alias: 'haiku',
    current: 'claude-haiku-5-5',
    use: 'mechanical work: renames, rote fixes, codebase search, fleet patch application',
  },
};

export interface WorkRoute {
  tier: Tier;
  effort: Effort;
  why: string;
}

/** Roadmap complexity tags and agent roles both route through here. */
export const WORK_ROUTES = {
  // roadmap complexity tags (ROADMAP.md shape tags)
  judgment: { tier: 'frontier', effort: 'high', why: 'design decisions; a wrong call is expensive to undo' },
  standard: { tier: 'standard', effort: 'medium', why: 'normal feature work against established patterns' },
  mechanical: { tier: 'fast', effort: 'low', why: 'rote, no decisions; speed and cost dominate' },
  // agent roles
  'architecture-review': { tier: 'frontier', effort: 'high', why: 'checks a diff against house practices; must catch what looks plausible' },
  'ux-flow-review': { tier: 'standard', effort: 'high', why: 'drives the app flow by flow; breadth over depth, taste calls go to the owner' },
  'launch-readiness': { tier: 'frontier', effort: 'high', why: 'go/no-go across UX, architecture, and invariants' },
  explore: { tier: 'fast', effort: 'low', why: 'read-only search; returns conclusions, not files' },
} as const satisfies Record<string, WorkRoute>;
export type WorkKind = keyof typeof WORK_ROUTES;

/** When `current` was last checked against the live Models API by a human. */
export const REVIEWED_ON = '2026-10-29';
export const REVIEW_EVERY_DAYS = 90;

export function aliasFor(kind: WorkKind): Family {
  return TIERS[WORK_ROUTES[kind].tier].alias;
}

export interface LiveModel {
  id: string;
  created_at: string;
}

export interface Drift {
  tier: Tier;
  current: string;
  newest: string;
}

/** Family of a model id (`claude-opus-5-5` -> `opus`), or null for families we don't route to. */
export function familyOf(id: string): Family | null {
  const m = /^claude-([a-z]+)-/.exec(id);
  return m && (FAMILIES as readonly string[]).includes(m[1]!) ? (m[1] as Family) : null;
}

/** Tiers whose family has a model newer than the one recorded as `current`. */
export function findDrift(live: readonly LiveModel[], tiers: Record<Tier, TierSpec> = TIERS): Drift[] {
  const newest = new Map<Family, LiveModel>();
  for (const model of live) {
    const family = familyOf(model.id);
    if (!family) continue;
    const best = newest.get(family);
    if (!best || model.created_at > best.created_at) newest.set(family, model);
  }
  return TIER_NAMES.flatMap((tier) => {
    const latest = newest.get(tiers[tier].alias);
    return latest && latest.id !== tiers[tier].current
      ? [{ tier, current: tiers[tier].current, newest: latest.id }]
      : [];
  });
}

/** Days since REVIEWED_ON as of `today` (YYYY-MM-DD, UTC). */
export function reviewAgeDays(today: string, reviewedOn: string = REVIEWED_ON): number {
  return Math.floor((Date.parse(today) - Date.parse(reviewedOn)) / 86_400_000);
}
