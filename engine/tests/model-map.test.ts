import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FAMILIES, TIERS, TIER_NAMES, WORK_ROUTES, familyOf, findDrift, findMissing, findNewFamilies, reviewAgeDays, rewriteModelMap } from '../src/routing/model-map.js';
import { buildRoutingPolicy } from '../src/generate/roadmap.js';

describe('model map', () => {
  test('every tier routes to a family alias, never a versioned id', () => {
    for (const tier of TIER_NAMES) expect(FAMILIES).toContain(TIERS[tier].alias);
  });

  test('every work route names a real tier', () => {
    for (const route of Object.values(WORK_ROUTES)) expect(TIER_NAMES).toContain(route.tier);
  });

  test('each recorded current model belongs to its alias family', () => {
    for (const tier of TIER_NAMES) expect(familyOf(TIERS[tier].current)).toBe(TIERS[tier].alias);
  });

  test('the stamped policy routes on aliases only', () => {
    const policy = buildRoutingPolicy() as { tiers: Record<string, { model: string }> };
    for (const spec of Object.values(policy.tiers)) expect(FAMILIES).toContain(spec.model);
  });
});

describe('findDrift', () => {
  const tiers = {
    frontier: { alias: 'opus', current: 'claude-opus-5-5', use: '' },
    standard: { alias: 'sonnet', current: 'claude-sonnet-5-5', use: '' },
    fast: { alias: 'haiku', current: 'claude-haiku-5-5', use: '' },
  } as const;

  test('no drift when each family newest is the recorded model', () => {
    const live = [
      { id: 'claude-opus-5', created_at: '2026-01-01T00:00:00Z' },
      { id: 'claude-opus-5-5', created_at: '2026-09-01T00:00:00Z' },
      { id: 'claude-sonnet-5-5', created_at: '2026-09-01T00:00:00Z' },
      { id: 'claude-haiku-5-5', created_at: '2026-09-01T00:00:00Z' },
    ];
    expect(findDrift(live, tiers)).toEqual([]);
  });

  test('flags a newer model in a routed family, by release date not by name', () => {
    const live = [
      { id: 'claude-opus-5-5', created_at: '2026-09-01T00:00:00Z' },
      { id: 'claude-opus-6', created_at: '2027-01-01T00:00:00Z' },
      { id: 'claude-sonnet-5-5', created_at: '2026-09-01T00:00:00Z' },
    ];
    expect(findDrift(live, tiers)).toEqual([{ tier: 'frontier', current: 'claude-opus-5-5', newest: 'claude-opus-6' }]);
  });

  test('ignores families no tier routes to', () => {
    expect(familyOf('claude-fable-5-1')).toBeNull();
    expect(findDrift([{ id: 'claude-fable-9', created_at: '2030-01-01T00:00:00Z' }], tiers)).toEqual([]);
  });
});

test('reviewAgeDays counts whole days', () => {
  expect(reviewAgeDays('2026-10-29', '2026-10-29')).toBe(0);
  expect(reviewAgeDays('2027-01-27', '2026-10-29')).toBe(90);
});

describe('the daily check', () => {
  const tiers = {
    frontier: { alias: 'opus', current: 'claude-opus-5-5', use: '' },
    standard: { alias: 'sonnet', current: 'claude-sonnet-5-5', use: '' },
    fast: { alias: 'haiku', current: 'claude-haiku-5-5', use: '' },
  } as const;
  const live = [
    { id: 'claude-opus-5-5', created_at: '2026-09-01T00:00:00Z' },
    { id: 'claude-sonnet-5-5', created_at: '2026-09-01T00:00:00Z' },
    { id: 'claude-fable-5-1', created_at: '2026-08-01T00:00:00Z' },
    { id: 'claude-lyric-1', created_at: '2027-02-01T00:00:00Z' },
  ];

  test('asks for a decision on a family that is neither routed nor deliberately left out', () => {
    expect(findNewFamilies(live, { fable: 'priced above Opus' })).toEqual(['lyric']);
    expect(findNewFamilies(live, { fable: 'x', lyric: 'y' })).toEqual([]);
  });

  test('flags a recorded model the API no longer lists', () => {
    expect(findMissing(live, tiers)).toEqual(['fast']);
  });

  test('rewrites only the drifted tier and the review date', () => {
    const source = readFileSync(join(import.meta.dirname, '..', 'src', 'routing', 'model-map.ts'), 'utf8');
    const out = rewriteModelMap(source, [{ tier: 'standard', current: TIERS.standard.current, newest: 'claude-sonnet-6' }], '2027-03-01');
    expect(out).toContain("current: 'claude-sonnet-6'");
    expect(out).toContain("export const REVIEWED_ON = '2027-03-01';");
    expect(out).toContain(`current: '${TIERS.frontier.current}'`);
    expect(out).toContain(`current: '${TIERS.fast.current}'`);
    expect(out.split('\n').length).toBe(source.split('\n').length);
  });
});
