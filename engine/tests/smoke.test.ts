import { globSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
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
  const PLUGINS = ['avani-core', 'avani-typescript', 'avani-python', 'avani-nextjs'];

  test('marketplace.json is valid and lists every plugin', () => {
    const raw = readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8');
    const manifest = JSON.parse(raw) as { name: string; plugins: Array<{ name: string; source: string }> };
    expect(manifest.name).toBe('avani');
    expect(manifest.plugins.map((p) => p.name).sort()).toEqual([...PLUGINS].sort());
  });

  test.each(PLUGINS)('%s plugin.json is valid', (plugin) => {
    const raw = readFileSync(join(ROOT, 'plugins', plugin, '.claude-plugin', 'plugin.json'), 'utf8');
    const manifest = JSON.parse(raw) as { name: string; version: string; description: string; author?: { name?: string } };
    expect(manifest.name).toBe(plugin);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.author?.name).toBe('Avani');
  });
});

describe('skill frontmatter (verified against Claude Code docs)', () => {
  const skillFiles = globSync(join(ROOT, 'plugins', '*', 'skills', '*', 'SKILL.md'));

  test('there are skills to check', () => {
    expect(skillFiles.length).toBeGreaterThanOrEqual(6);
  });

  test.each(skillFiles.map((f) => [f.split('/').slice(-4).join('/'), f]))('%s', (_label, file) => {
    const raw = readFileSync(file, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
    expect(match, 'has frontmatter').toBeTruthy();
    const fm = match![1] as string;

    const field = (name: string): string | undefined => fm.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1];
    const name = field('name');
    const description = field('description');
    const whenToUse = field('when_to_use');

    // name matches the directory (how the skill is namespaced/invoked)
    expect(name).toBe(basename(dirname(file)));
    expect(description?.length ?? 0).toBeGreaterThan(20);
    expect(whenToUse?.length ?? 0).toBeGreaterThan(20);
    // description + when_to_use share the documented 1,536-char listing cap
    expect((description?.length ?? 0) + (whenToUse?.length ?? 0)).toBeLessThanOrEqual(1536);
    // no unsupported fields (SPEC §8: there is no `trigger` frontmatter field)
    expect(fm).not.toMatch(/^trigger:/m);
  });
});
