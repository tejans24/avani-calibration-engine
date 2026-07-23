import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { calibrate } from '../src/calibration/calibrate.js';
import { deriveDials } from '../src/calibration/derive.js';
import { runPipeline } from '../src/pipeline.js';
import { parseCalibratedConfig } from '../src/schema/calibrated-config.js';
import { parseIntakeProfile, type IntakeProfile } from '../src/schema/intake-profile.js';
import { parseSelectionContext } from '../src/selection/context.js';

const ROOT = join(import.meta.dirname, '..', '..');
const load = (rel: string): unknown => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const intake = (): IntakeProfile => parseIntakeProfile(load('examples/invasive-species/intake-profile.json'));

describe('calibrate (intake -> selection context)', () => {
  test('reproduces the golden selection context', () => {
    const expected = parseSelectionContext(load('examples/invasive-species/selection-context.json'));
    expect(calibrate(intake())).toEqual(expected);
  });

  test('derives dials from intake facts', () => {
    const base = intake();
    // append-only comes from data provenance
    expect(deriveDials(base).correctness_bar).toBe('append-only');
    // strict comes from money when provenance is not critical
    expect(deriveDials({ ...base, data_provenance_critical: false, has_money_transactions: true }).correctness_bar).toBe('strict');
    // plain standard otherwise
    expect(deriveDials({ ...base, data_provenance_critical: false, has_money_transactions: false }).correctness_bar).toBe('standard');
    // sensitivity steps down with fewer signals
    expect(deriveDials({ ...base, has_protected_geo: false }).sensitivity).toBe('high');
    expect(deriveDials({ ...base, has_pii: false, has_protected_geo: false }).sensitivity).toBe('medium');
  });
});

describe('runPipeline (end-to-end)', () => {
  test('produces the golden calibrated-config', () => {
    expect(runPipeline(intake()).config).toEqual(load('examples/invasive-species/calibrated-config.json'));
  });

  test('the assembled config is schema-valid', () => {
    expect(() => parseCalibratedConfig(runPipeline(intake()).config)).not.toThrow();
  });

  test('selection produces the invariants that end up in the config', () => {
    const { config } = runPipeline(intake());
    expect(config.invariants).toContain('observations_append_only_never_delete');
    expect(config.invariants).toContain('geo_coordinate_fuzzing_public_views');
  });

  test('selects the field-data moat plugin and offline stack', () => {
    const ids = new Set(runPipeline(intake()).selection.provisions.map((p) => p.id));
    expect(ids.has('plugin:avani-field-data')).toBe(true);
    expect(ids.has('plugin:avani-offline')).toBe(true);
    expect(ids.has('plugin:avani-core')).toBe(true);
  });

  test('a lean profile selects only the baseline stack', () => {
    const lean: IntakeProfile = {
      ...intake(),
      type: 'saas',
      offline_required: false,
      has_pii: false,
      has_protected_geo: false,
      has_money_transactions: false,
      data_provenance_critical: false,
      roles: ['user'],
    };
    const ids = new Set(runPipeline(lean).selection.provisions.map((p) => p.id));
    expect(ids.has('plugin:avani-core')).toBe(true);
    expect(ids.has('plugin:avani-typescript')).toBe(true);
    expect(ids.has('plugin:avani-field-data')).toBe(false);
    expect(ids.has('plugin:avani-offline')).toBe(false);
    expect(ids.has('plugin:avani-clerk')).toBe(false); // single role -> no clerk
  });
});
