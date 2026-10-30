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
 *    last looked. Informational only: nothing routes on it.
 *
 * `npm run models:check` (daily, .github/workflows/models.yml) compares the
 * map with the live Models API. When a routed family has a newer model it
 * opens a pull request updating `current` and REVIEWED_ON; merging it is the
 * review, so its description asks the one human question: should any route
 * move? It also reports a family nobody has decided about yet (not routed,
 * not in UNROUTED_FAMILIES), a recorded model the API no longer lists, and a
 * review older than REVIEW_EVERY_DAYS.
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

/**
 * Families the API lists that no tier routes to, on purpose, with why. A
 * family in neither TIERS nor here is new, and the check asks for a decision.
 */
export const UNROUTED_FAMILIES: Record<string, string> = {
  fable: 'Most capable, priced above Opus; route to it only by a deliberate decision for a named kind of work.',
  mythos: 'Available only through an access program.',
};

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

/** Any family name in a model id (`claude-fable-5-1` -> `fable`), routed or not. */
export function rawFamily(id: string): string | null {
  return /^claude-([a-z]+)-/.exec(id)?.[1] ?? null;
}

/** Family of a model id (`claude-opus-5-5` -> `opus`), or null for families we don't route to. */
export function familyOf(id: string): Family | null {
  const f = rawFamily(id);
  return f && (FAMILIES as readonly string[]).includes(f) ? (f as Family) : null;
}

/** Families the API lists that are neither routed nor deliberately left out: each needs a decision. */
export function findNewFamilies(live: readonly LiveModel[], unrouted: Record<string, string> = UNROUTED_FAMILIES): string[] {
  const seen = new Set(live.flatMap((m) => rawFamily(m.id) ?? []));
  return [...seen].filter((f) => !(FAMILIES as readonly string[]).includes(f) && !(f in unrouted)).sort();
}

/** Tiers whose recorded model the API no longer lists (retired, or a typo). Aliases still work; anything pinned to the id would not. */
export function findMissing(live: readonly LiveModel[], tiers: Record<Tier, TierSpec> = TIERS): Tier[] {
  const ids = new Set(live.map((m) => m.id));
  return TIER_NAMES.filter((tier) => !ids.has(tiers[tier].current));
}

/**
 * This file's source with each drifted tier's `current` set to the newest
 * model and REVIEWED_ON set to `today`. Text in, text out, so the daily job
 * can open a pull request with exactly this diff.
 */
export function rewriteModelMap(source: string, drift: readonly Drift[], today: string, tiers: Record<Tier, TierSpec> = TIERS): string {
  let out = source;
  for (const d of drift) {
    const re = new RegExp(`(alias: '${tiers[d.tier].alias}',\\s*current: ')[^']+(')`);
    if (!re.test(out)) throw new Error(`model map: no current for the ${d.tier} tier to update`);
    out = out.replace(re, `$1${d.newest}$2`);
  }
  const reviewed = /export const REVIEWED_ON = '[^']+';/;
  if (!reviewed.test(out)) throw new Error('model map: no REVIEWED_ON to update');
  return out.replace(reviewed, `export const REVIEWED_ON = '${today}';`);
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
