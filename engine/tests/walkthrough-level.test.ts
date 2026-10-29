import { describe, expect, test } from 'vitest';
import { deriveWalkthrough } from '../src/calibration/derive.js';
import { applyBlocks, stampBlueprint, type WalkthroughLevel } from '../src/generate/blueprints.js';
import { selfPresetIntake } from '../src/generate/new-project.js';

const stamp = (level: WalkthroughLevel) => stampBlueprint('ts-nextjs-prisma', { APP_NAME: 'my-app', WALKTHROUGH: level });

describe('walkthrough dial', () => {
  test('follows who uses the screens', () => {
    const base = selfPresetIntake();
    expect(deriveWalkthrough({ ...base, audience: 'external' })).toBe('live');
    expect(deriveWalkthrough({ ...base, audience: 'internal' })).toBe('screenshots');
    expect(deriveWalkthrough({ ...base, audience: 'none' })).toBe('off');
    expect(deriveWalkthrough({ ...base, audience: 'external', prototype: true })).toBe('off');
  });
});

describe('stamping by walkthrough level', () => {
  test('no marker ever reaches a project', () => {
    for (const level of ['off', 'screenshots', 'live'] as const) {
      for (const [path, content] of Object.entries(stamp(level))) expect(content, `${level}: ${path}`).not.toMatch(/avani:(if|end)/);
    }
  });

  test('live: registry, screenshots, and the guided tour', () => {
    const files = stamp('live');
    expect(files['src/components/walkthrough-panel.tsx']).toBeDefined();
    expect(files['src/app/api/walkthrough/route.ts']).toBeDefined();
    expect(files['src/app/layout.tsx']).toContain('walkthroughProblem() === null');
    const scripts = (JSON.parse(files['package.json']!) as { scripts: Record<string, string> }).scripts;
    expect(scripts['walkthrough']).toBeDefined();
    expect(scripts['walkthrough:shots']).toBeDefined();
  });

  test('screenshots: registry and screenshot page, nothing of the live tour', () => {
    const files = stamp('screenshots');
    expect(files['src/flows/flows.ts']).toBeDefined();
    expect(files['scripts/walkthrough.ts']).toBeDefined();
    for (const path of ['src/components/walkthrough-panel.tsx', 'src/lib/walkthrough.ts', 'src/flows/review.ts', 'src/app/api/walkthrough/route.ts']) {
      expect(files[path], path).toBeUndefined();
    }
    expect(files['src/app/layout.tsx']).not.toMatch(/walkthrough/i);
    expect(files['.env.example']).not.toContain('WALKTHROUGH');
    expect(files['README.md']).toContain('walkthrough:shots');
    expect(files['README.md']).not.toContain('npm run walkthrough`');
    const scripts = (JSON.parse(files['package.json']!) as { scripts: Record<string, string> }).scripts;
    expect(scripts['walkthrough']).toBeUndefined();
    expect(scripts['walkthrough:shots']).toBeDefined();
  });

  test('off: no walkthrough at all', () => {
    const files = stamp('off');
    expect(Object.keys(files).filter((p) => /walkthrough|src\/flows\//.test(p))).toEqual([]);
    expect(files['.github/workflows/ci.yml']).not.toContain('walkthrough');
    expect(files['README.md']).not.toContain('Walking someone through');
    expect(files['package.json']).not.toContain('walkthrough');
  });
});

describe('applyBlocks', () => {
  const vars = { APP_NAME: 'x', WALKTHROUGH: 'screenshots' as const };
  test('keeps or drops a block by its condition and strips the markers', () => {
    const src = 'a\n// avani:if walkthrough>=live\nb\n// avani:end\n# avani:if walkthrough>=screenshots\nc\n# avani:end\nd';
    expect(applyBlocks(src, vars)).toBe('a\nc\nd');
  });

  test('rejects nesting, unclosed blocks, and unknown conditions', () => {
    expect(() => applyBlocks('// avani:if walkthrough>=live\n// avani:if walkthrough>=live\n// avani:end', vars)).toThrow(/nested/);
    expect(() => applyBlocks('// avani:if walkthrough>=live\nx', vars)).toThrow(/without avani:end/);
    expect(() => applyBlocks('// avani:if colour>=blue\n// avani:end', vars)).toThrow(/unknown stamp condition/);
  });
});
