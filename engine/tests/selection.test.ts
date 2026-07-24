import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { parseSelectionContext } from '../src/selection/context.js';
import { buildGraph, select, validateGraph } from '../src/selection/select.js';

const ROOT = join(import.meta.dirname, '..', '..');
const load = (rel: string): unknown => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

const ctx = () => parseSelectionContext(load('examples/invasive-species/selection-context.json'));

describe('selection map integrity', () => {
  test('every rule references a real condition and real provisions', () => {
    expect(validateGraph()).toEqual([]);
  });

  test('signals default to false when omitted', () => {
    const c = parseSelectionContext({
      profile: 'saas',
      dials: { correctness_bar: 'standard', sensitivity: 'medium', infra: 'vercel', runtime: 'python', topology: 'single-app' },
    });
    expect(c.signals.offline_required).toBe(false);
    expect(c.signals.has_payments).toBe(false);
  });
});

describe('select(invasive-species)', () => {
  const result = () => select(ctx());

  test('always selects the Tier 1 core plugin', () => {
    expect(result().byProvision['plugin:avani-core']).toEqual(['always']);
  });

  test('selects the expected provisions', () => {
    const ids = result().provisions.map((p) => p.id).sort();
    expect(ids).toEqual(
      [
        'blueprint:ts-nextjs-prisma',
        'invariant:a11y_axe_clean',
        'invariant:geo_coordinate_fuzzing_public_views',
        'invariant:observation_id_uniqueness',
        'invariant:observations_append_only_never_delete',
        'invariant:session_expires_event_plus_24hrs',
        'pattern:nextjs-app-router',
        'pattern:prisma-postgis',
        'pattern:pwa-manifest',
        'pattern:react-hook-form-zod',
        'pattern:zustand-offline-queue',
        'plugin:avani-clerk',
        'plugin:avani-core',
        'plugin:avani-field-data',
        'plugin:avani-nextjs',
        'plugin:avani-offline',
        'plugin:avani-postgis',
        'plugin:avani-typescript',
      ].sort(),
    );
  });

  test('does not select python or monorepo or payment provisions', () => {
    const ids = new Set(result().provisions.map((p) => p.id));
    expect(ids.has('plugin:avani-python')).toBe(false);
    expect(ids.has('blueprint:monorepo-root')).toBe(false);
    expect(ids.has('plugin:avani-stripe')).toBe(false);
  });

  test('geo fuzzing invariant is shared by two branches (fan-in)', () => {
    const conds = result().byProvision['invariant:geo_coordinate_fuzzing_public_views'];
    expect(conds?.sort()).toEqual(['sensitivity:protected', 'signal:geo']);
  });
});

describe('emitted selection map', () => {
  test('committed selection-map.json matches the source (run `npm run selection:build` if this fails)', () => {
    expect(load('selection/selection-map.json')).toEqual(buildGraph());
  });

  test('the graph marks shared provisions', () => {
    const shared = buildGraph().sharing['invariant:geo_coordinate_fuzzing_public_views'];
    expect(shared?.length).toBe(2);
  });

  test('carries composition detail: purpose, rationale, kind roles', () => {
    const g = buildGraph();
    expect(g.compositionSummary.length).toBeGreaterThan(20);
    expect(Object.keys(g.kindRoles).sort()).toEqual(['blueprint', 'invariant', 'pattern', 'plugin']);
    expect(g.provisions.every((p) => p.purpose.length > 0)).toBe(true);
    expect(g.conditions.every((c) => c.rationale.length > 0)).toBe(true);
  });

  test('worksWith links are symmetric', () => {
    const g = buildGraph();
    const byId = Object.fromEntries(g.provisions.map((p) => [p.id, p]));
    expect(byId['blueprint:ts-nextjs-prisma']?.worksWith).toContain('plugin:avani-nextjs');
    // the pairing holds in both directions even though only one side declares it
    expect(byId['plugin:avani-nextjs']?.worksWith).toContain('blueprint:ts-nextjs-prisma');
  });
});
