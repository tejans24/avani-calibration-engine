import { globSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

  test('new without a name or with a bad name is a usage error', () => {
    expect(run(['new'])).toBe(1);
    expect(run(['new', 'Bad Name'])).toBe(1);
  });

  test('new refuses a non-empty output directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'avani-new-'));
    try {
      writeFileSync(join(dir, 'existing.txt'), 'x');
      expect(run(['new', 'demo-app', '--out', dir])).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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

/**
 * Durability gate (SPEC §2.1): plugins propagate centrally to projects on
 * different stack versions, so a release-specific claim in a plugin is not
 * merely stale — it is wrong for every project on a different version.
 * Naming a tool is fine (the choice is dial-selected and stable); asserting
 * what release N of it does is not. Dated facts belong in a script, a gate, or
 * the quarantined "Stack notes (current pins)" section.
 */
const TOOL_RELEASE = /\b(Next\.js|Next|React|Prisma|Clerk|ESLint|Vitest|Playwright|Tailwind|Zod|TypeScript|Node|Postgres|PostgreSQL|Python|Django|Vue|Svelte)\s+v?\d+/gi;

/** Content minus any "## Stack notes …" section — where dated facts are legal. */
function withoutStackNotes(body: string): string {
  return body
    .split(/^## /m)
    .filter((section) => !/^stack notes/i.test(section))
    .join('\n');
}

describe('skill durability (no release-specific claims)', () => {
  const skillFiles = globSync(join(ROOT, 'plugins', '*', 'skills', '*', 'SKILL.md'));

  test.each(skillFiles.map((f) => [f.split('/').slice(-4).join('/'), f]))('%s', (_label, file) => {
    const body = withoutStackNotes(readFileSync(file, 'utf8'));
    const hits = [...body.matchAll(TOOL_RELEASE)].map((m) => m[0]);
    expect(
      hits,
      `release-specific claim(s) in a plugin skill: ${hits.join(', ')}. Encode the mechanism in a script or gate, state the durable principle here, or move the dated fact under "## Stack notes (current pins)".`,
    ).toEqual([]);
  });
});
