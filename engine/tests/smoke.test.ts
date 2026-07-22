import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { run } from '../bin/calibrate.js';

const ROOT = join(import.meta.dirname, '..', '..');

describe('CLI stub', () => {
  test('help exits 0', () => {
    expect(run(['--help'])).toBe(0);
  });

  test('known subcommands exit 0', () => {
    for (const cmd of ['init', 'calibrate', 'generate', 'retro']) {
      expect(run([cmd])).toBe(0);
    }
  });

  test('unknown subcommand exits 1', () => {
    expect(run(['bogus'])).toBe(1);
  });
});

describe('marketplace manifests', () => {
  test('marketplace.json is valid and lists avani-core', () => {
    const raw = readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8');
    const manifest = JSON.parse(raw) as { name: string; plugins: Array<{ name: string; source: string }> };
    expect(manifest.name).toBe('avani');
    expect(manifest.plugins.map((p) => p.name)).toContain('avani-core');
  });

  test('avani-core plugin.json is valid', () => {
    const raw = readFileSync(join(ROOT, 'plugins', 'avani-core', '.claude-plugin', 'plugin.json'), 'utf8');
    const manifest = JSON.parse(raw) as { name: string; version: string };
    expect(manifest.name).toBe('avani-core');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
