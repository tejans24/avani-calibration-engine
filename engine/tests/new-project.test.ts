import { describe, expect, test } from 'vitest';
import { blueprintHasFiles, stampBlueprint } from '../src/generate/blueprints.js';
import { buildNewProject, selfPresetIntake } from '../src/generate/new-project.js';
import { runPipeline } from '../src/pipeline.js';

describe('blueprint stamping (ts-nextjs-prisma)', () => {
  const stamped = () => stampBlueprint('ts-nextjs-prisma', { APP_NAME: 'demo-app' });

  test('the MVP blueprint has template files', () => {
    expect(blueprintHasFiles('ts-nextjs-prisma')).toBe(true);
    expect(blueprintHasFiles('python-fastapi')).toBe(false);
  });

  test('stamps the runnable skeleton: app, prisma, db layer, three test tiers, CI', () => {
    const paths = Object.keys(stamped());
    for (const expected of [
      'package.json',
      'prisma/schema.prisma',
      'prisma/migrations/000000000000_init/migration.sql',
      'src/app/page.tsx',
      'src/components/note-form.tsx',
      'src/lib/auth.ts',
      'src/middleware.ts',
      'postcss.config.mjs',
      'src/schemas/note.ts',
      'src/services/notes/note-service.ts',
      'src/services/notes/note-service.test.ts',
      'tests/integration/note-service.integration.test.ts',
      'tests/e2e/home.spec.ts',
      'db/factories/note.ts',
      'db/scenarios/workspace.ts',
      'db/seed.ts',
      'db/init.ts',
      '.github/workflows/ci.yml',
      'docker-compose.yml',
    ]) {
      expect(paths, expected).toContain(expected);
    }
  });

  test('renames un-dotted template files to their real names', () => {
    const paths = Object.keys(stamped());
    expect(paths).toContain('.gitignore');
    expect(paths).toContain('.env.example');
    expect(paths).not.toContain('gitignore');
    expect(paths).not.toContain('env.example');
  });

  test('substitutes APP_NAME everywhere and leaves no placeholders behind', () => {
    const files = stamped();
    const pkg = JSON.parse(files['package.json'] as string) as { name: string };
    expect(pkg.name).toBe('demo-app');
    for (const [path, content] of Object.entries(files)) {
      expect(content, path).not.toContain('{{');
    }
  });

  test('the seed layer is stage-guarded and the e2e tier carries the axe invariant', () => {
    const files = stamped();
    expect(files['db/seed.ts']).toContain("assertDevStage('db:seed')");
    expect(files['tests/e2e/home.spec.ts']).toContain('a11y_axe_clean');
    expect(files['package.json']).toContain('db:migrate:deploy');
  });
});

describe('avani new (self mode)', () => {
  test('house preset calibrates to the default stack with quiet dials', () => {
    const { context, selection } = runPipeline(selfPresetIntake());
    expect(context.dials).toMatchObject({
      runtime: 'ts-nextjs',
      topology: 'single-app',
      correctness_bar: 'standard',
      sensitivity: 'medium',
      infra: 'vercel',
    });
    const ids = selection.provisions.map((p) => p.id);
    expect(ids).toContain('plugin:avani-core');
    expect(ids).toContain('plugin:avani-nextjs');
    expect(ids).toContain('blueprint:ts-nextjs-prisma');
    expect(ids).toContain('invariant:a11y_axe_clean');
    // quiet preset: no domain/moat provisions
    expect(ids).not.toContain('plugin:avani-clerk');
    expect(ids).not.toContain('plugin:avani-field-data');
  });

  test('produces blueprint + residue + execution layer in one FileMap', () => {
    const { files } = buildNewProject('my-app');
    // blueprint skeleton
    expect(files['package.json']).toContain('"name": "my-app"');
    // engine residue
    expect(files['CLAUDE.md']).toBeDefined();
    expect(files['.claude/settings.json']).toContain('avani-nextjs@avani');
    expect(files['tests/invariants/a11y_axe_clean.test.ts']).toBeDefined();
    // execution layer
    expect(files['ROADMAP.md']).toContain('my-app — Roadmap');
    expect(files['ROADMAP.md']).not.toMatch(/claude-|gpt-|gemini/i);
    const routing = JSON.parse(files['.avani/routing-policy.json'] as string) as { map: Record<string, string> };
    expect(routing.map).toEqual({ mechanical: 'fast', standard: 'standard', judgment: 'frontier' });
  });

  test('is deterministic — two runs produce identical output', () => {
    expect(buildNewProject('my-app').files).toEqual(buildNewProject('my-app').files);
  });

  test('rejects invalid names', () => {
    expect(() => buildNewProject('My App')).toThrow(/invalid project name/);
  });
});
