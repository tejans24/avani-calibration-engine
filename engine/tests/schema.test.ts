import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { CalibratedConfigSchema, parseCalibratedConfig } from '../src/schema/calibrated-config.js';
import { CorrectnessBar, Runtime, Sensitivity } from '../src/schema/dials.js';
import { IntakeProfileSchema, parseIntakeProfile } from '../src/schema/intake-profile.js';
import { toJsonSchema } from '../src/schema/json-schema.js';
import { SCHEMAS } from '../src/schema/registry.js';
import { SCHEMA_VERSION, isSupportedVersion } from '../src/schema/version.js';

const ROOT = join(import.meta.dirname, '..', '..');
const load = (rel: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) as Record<string, unknown>;

const INTAKE = 'examples/invasive-species/intake-profile.json';
const CONFIG = 'examples/invasive-species/calibrated-config.json';

describe('dial vocabulary', () => {
  test('enums match the spec', () => {
    expect(CorrectnessBar.options).toEqual(['basic', 'standard', 'strict', 'append-only']);
    expect(Sensitivity.options).toEqual(['low', 'medium', 'high', 'protected']);
    expect(Runtime.options).toEqual(['ts-nextjs', 'python']);
  });
});

describe('intake-profile validation', () => {
  test('valid fixture parses', () => {
    expect(() => parseIntakeProfile(load(INTAKE))).not.toThrow();
  });

  test('rejects an unknown ops_capacity', () => {
    const data = load(INTAKE);
    data.ops_capacity = 'infinite';
    expect(IntakeProfileSchema.safeParse(data).success).toBe(false);
  });

  test('rejects a missing required field', () => {
    const data = load(INTAKE);
    delete data.roles;
    expect(IntakeProfileSchema.safeParse(data).success).toBe(false);
  });

  test('rejects an empty roles array', () => {
    const data = load(INTAKE);
    data.roles = [];
    expect(IntakeProfileSchema.safeParse(data).success).toBe(false);
  });
});

describe('calibrated-config validation', () => {
  test('valid fixture parses', () => {
    expect(() => parseCalibratedConfig(load(CONFIG))).not.toThrow();
  });

  test('rejects an invalid dial value', () => {
    const data = load(CONFIG);
    (data.dials as Record<string, unknown>).correctness_bar = 'ultra';
    expect(CalibratedConfigSchema.safeParse(data).success).toBe(false);
  });
});

describe('versioning', () => {
  test('fixtures declare the current schema version', () => {
    expect(load(INTAKE).schemaVersion).toBe(SCHEMA_VERSION);
    expect(load(CONFIG).schemaVersion).toBe(SCHEMA_VERSION);
  });

  test('major-version mismatch is rejected at parse', () => {
    const data = load(INTAKE);
    data.schemaVersion = '2.0.0';
    expect(() => parseIntakeProfile(data)).toThrow(/not supported/);
  });

  test('same-major, higher-minor is accepted', () => {
    expect(isSupportedVersion('1.9.9')).toBe(true);
    expect(isSupportedVersion('2.0.0')).toBe(false);
  });
});

describe('emitted artifacts', () => {
  test('committed JSON Schema matches the Zod source (run `npm run schema:build` if this fails)', () => {
    for (const { name, schema } of SCHEMAS) {
      const inMemory = toJsonSchema(name, schema);
      const committed = load(`schemas/${name}.schema.json`);
      expect(committed).toEqual(inMemory);
    }
  });

  test('JSON Schema carries field descriptions and enum values', () => {
    const json = toJsonSchema('intake-profile', IntakeProfileSchema) as {
      properties: Record<string, { description?: string; enum?: string[] } | undefined>;
    };
    const opsCapacity = json.properties.ops_capacity;
    expect(opsCapacity?.description).toBeTruthy();
    expect(opsCapacity?.enum).toContain('low');
    expect(json.properties.offline_required?.description).toBeTruthy();
  });
});
