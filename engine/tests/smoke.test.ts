import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { run } from '../bin/calibrate.js';

const ROOT = join(import.meta.dirname, '..', '..');

describe('CLI stub', () => {
  test('help exits 0', () => {
    expect(run(['--help'])).toBe(0);
  });

  test('stubbed subcommands exit 0', () => {
    for (const cmd of ['init', 'stage', 'sync', 'handoff', 'retro']) {
      expect(run([cmd])).toBe(0);
    }
  });

  test('calibrate runs the pipeline on an intake file', () => {
    expect(run(['calibrate', join(ROOT, 'examples/invasive-species/intake-profile.json'), '--json'])).toBe(0);
  });

  test('calibrate and generate without a path are usage errors', () => {
    expect(run(['calibrate'])).toBe(1);
    expect(run(['generate'])).toBe(1);
  });

  test('unknown subcommand exits 1', () => {
    expect(run(['bogus'])).toBe(1);
  });
});

describe('marketplace manifests', () => {
  const PLUGINS = ['avani-core', 'avani-typescript', 'avani-python'];

  test('marketplace.json is valid and lists every plugin', () => {
    const raw = readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8');
    const manifest = JSON.parse(raw) as { name: string; plugins: Array<{ name: string; source: string }> };
    expect(manifest.name).toBe('avani');
    expect(manifest.plugins.map((p) => p.name).sort()).toEqual([...PLUGINS].sort());
  });

  test.each(PLUGINS)('%s plugin.json is valid', (plugin) => {
    const raw = readFileSync(join(ROOT, 'plugins', plugin, '.claude-plugin', 'plugin.json'), 'utf8');
    const manifest = JSON.parse(raw) as { name: string; version: string };
    expect(manifest.name).toBe(plugin);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
