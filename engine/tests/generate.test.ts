import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { generateProject } from '../src/generate/generate.js';
import { runPipeline } from '../src/pipeline.js';
import { parseIntakeProfile, type IntakeProfile } from '../src/schema/intake-profile.js';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');
const intake = (): IntakeProfile => parseIntakeProfile(JSON.parse(read('examples/invasive-species/intake-profile.json')));
const project = () => {
  const { config, selection } = runPipeline(intake());
  return generateProject(config, selection);
};

const GEN = 'examples/invasive-species/generated';

describe('generated project', () => {
  test('emits the expected file set', () => {
    expect(Object.keys(project()).sort()).toEqual([
      '.avani/manifest.json',
      '.claude/settings.json',
      '.mcp.json',
      'CLAUDE.md',
      'tests/invariants/a11y_axe_clean.test.ts',
      'tests/invariants/geo_coordinate_fuzzing_public_views.test.ts',
      'tests/invariants/observation_id_uniqueness.test.ts',
      'tests/invariants/observations_append_only_never_delete.test.ts',
      'tests/invariants/session_expires_event_plus_24hrs.test.ts',
    ]);
  });

  test('committed golden matches the generator (run `calibrate generate ... --out` if this fails)', () => {
    for (const [rel, content] of Object.entries(project())) {
      expect(content, rel).toEqual(read(`${GEN}/${rel}`));
    }
  });
});

describe('settings.json', () => {
  const settings = () => JSON.parse(project()['.claude/settings.json'] as string);

  test('enabledPlugins is an object of name@marketplace -> true', () => {
    const enabled = settings().enabledPlugins;
    expect(enabled['avani-core@avani']).toBe(true);
    expect(enabled['avani-field-data@avani']).toBe(true);
    expect(Array.isArray(enabled)).toBe(false);
  });

  test('declares the marketplace and denies secret reads', () => {
    const s = settings();
    expect(s.extraKnownMarketplaces.avani.source.source).toBe('github');
    expect(s.permissions.deny).toContain('Read(./.env)');
    // protected sensitivity adds key/pem denials
    expect(s.permissions.deny).toContain('Read(./**/*.key)');
  });
});

describe('CLAUDE.md', () => {
  test('is thin and states the append-only + protected gotchas', () => {
    const md = project()['CLAUDE.md'] as string;
    expect(md.split('\n').length).toBeLessThan(200);
    expect(md).toContain('append-only');
    expect(md).toContain('fuzz coordinates');
    expect(md).toContain('prisma db push');
  });
});

describe('invariant tests', () => {
  test('one stub per selected invariant, referencing its guarantee', () => {
    const files = project();
    const appendOnly = files['tests/invariants/observations_append_only_never_delete.test.ts'] as string;
    expect(appendOnly).toContain("describe('observations_append_only_never_delete'");
    expect(appendOnly).toContain('never deleted');
  });
});
