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
      'src/app/error.tsx',
      'src/app/not-found.tsx',
      'src/components/note-form.tsx',
      'src/lib/auth.ts',
      'src/lib/prisma-client.ts',
      'src/proxy.ts',
      'prisma.config.ts',
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

  test('rejects invalid names, including trailing or doubled dashes', () => {
    for (const bad of ['My App', 'app-', 'a--b', '-app', '9app']) {
      expect(() => buildNewProject(bad), bad).toThrow(/invalid project name/);
    }
  });
});

describe('per-app db port', () => {
  const portIn = (content: string): string => {
    const m = content.match(/localhost:(\d+)\//);
    if (!m?.[1]) throw new Error('no port in env file');
    return m[1];
  };

  test('compose mapping and env file agree, and the port is deterministic', () => {
    const a = stampBlueprint('ts-nextjs-prisma', { APP_NAME: 'demo-app' });
    const b = stampBlueprint('ts-nextjs-prisma', { APP_NAME: 'demo-app' });
    const port = portIn(a['.env.example'] as string);
    expect(a['docker-compose.yml']).toContain(`'${port}:5432'`);
    expect(portIn(b['.env.example'] as string)).toBe(port);
    expect(Number(port)).toBeGreaterThanOrEqual(5433);
  });

  test('different apps get different ports', () => {
    const a = stampBlueprint('ts-nextjs-prisma', { APP_NAME: 'demo-app' });
    const b = stampBlueprint('ts-nextjs-prisma', { APP_NAME: 'other-app' });
    expect(portIn(a['.env.example'] as string)).not.toBe(portIn(b['.env.example'] as string));
  });
});

describe('stamped subagent definitions (SPEC §4.4 task bounds)', () => {
  const files = buildNewProject('fresh-app').files;
  const agents = ['feature-worker', 'infra-worker', 'verifier'] as const;

  test.each(agents)('%s is stamped with frontmatter and bounds', (name) => {
    const body = files[`.claude/agents/${name}.md`];
    expect(body, name).toBeDefined();
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(body as string);
    expect(fm, 'frontmatter').not.toBeNull();
    expect(fm![1]).toContain(`name: ${name}`);
    expect(fm![1]).toMatch(/^model: (sonnet|opus|haiku|inherit)$/m);
    // Bounds, not vibes: every role names what it escalates on and reports.
    expect(body).toContain('## Escalate when');
    expect(body).toContain('## Report');
  });

  test('no agent definition names a model release — only the routing policy does', () => {
    for (const name of agents) {
      expect(files[`.claude/agents/${name}.md`]).not.toMatch(/claude-[a-z]+-\d/);
    }
  });

  test('the verifier is read-and-run only', () => {
    const body = files['.claude/agents/verifier.md'] as string;
    const tools = /^tools: (.*)$/m.exec(body)?.[1] ?? '';
    expect(tools.split(',').map((t) => t.trim())).not.toContain('Edit');
    expect(tools.split(',').map((t) => t.trim())).not.toContain('Write');
  });

  test('workers never deploy: every definition carries the handcuff', () => {
    for (const name of agents) {
      expect(files[`.claude/agents/${name}.md`]).toMatch(/never (run a deploy|commit, push, install)/i);
    }
  });
});
