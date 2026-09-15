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

describe('self mode records the deploy target as an owner decision', () => {
  const { files, result } = buildNewProject('fresh-app');

  test('the manifest carries proposal and decision side by side', () => {
    const manifest = JSON.parse(files['.avani/manifest.json'] as string) as { decisions: { infra: Record<string, unknown> } };
    expect(manifest.decisions.infra).toMatchObject({ proposed: 'vercel', status: 'decided', decided: 'vercel', decided_by: 'owner' });
    expect(result.config.dials.infra).toBe('vercel');
  });

  test('the roadmap decision log is seeded with the why, the runner-up, and the unanswered inputs', () => {
    const roadmap = files['ROADMAP.md'] as string;
    const decisions = roadmap.split('## Decisions')[1]?.split('## Handoff notes')[0] ?? '';
    expect(decisions).toMatch(/infra = `vercel`/);
    expect(decisions).toMatch(/engine proposed/);
    expect(decisions).toMatch(/accepted by the owner/);
    expect(decisions).toMatch(/Runner-up: railway/);
    expect(decisions).toMatch(/existing_cloud/);
  });

  test('CLAUDE.md states the target was decided by the owner, not chosen by a session', () => {
    expect(files['CLAUDE.md']).toMatch(/decided by the owner/);
    expect(files['CLAUDE.md']).toMatch(/never a per-session choice/);
  });
});

describe('self mode stamps a decided decision brief', () => {
  test('the brief records the house-preset decision with the menu still in view', () => {
    const brief = buildNewProject('fresh-app').files['.avani/decisions/infra.md'] as string;
    expect(brief).toMatch(/\*\*Decided: `vercel`\*\* by owner/);
    expect(brief).toContain('### `railway`');
    expect(brief).toContain('### `self-hosted`');
  });
});

describe('stamp-time deploy decision and the railway profile', () => {
  test('the house preset stamps the health route but no deploy pipeline (vercel is a house position)', () => {
    const { files } = buildNewProject('fresh-app');
    expect(files['src/app/api/health/route.ts']).toContain("status: 'ok'");
    expect(files['railway.toml']).toBeUndefined();
    expect(files['.github/workflows/deploy.yml']).toBeUndefined();
    expect(files['CLAUDE.md']).toMatch(/Stamped profile:\*\* none yet for `vercel`/);
  });

  test('--infra railway stamps the shipped pipeline with the app name substituted', () => {
    const { files, result } = buildNewProject('fresh-app', { infra: 'railway', why: 'needs a worker' });
    for (const f of ['railway.toml', '.github/workflows/deploy.yml', '.github/workflows/backup-production-db.yml', 'DEPLOYMENT.md']) {
      expect(files[f], f).toBeDefined();
      expect(files[f], `${f} has an unsubstituted placeholder`).not.toContain('{{APP_NAME}}');
    }
    expect(files['.github/workflows/backup-production-db.yml']).toContain('fresh-app-prod-backup-');
    expect(files['.github/workflows/ci.yml'], 'the base CI ladder is still stamped').toBeDefined();
    expect(result.config.dials.infra).toBe('railway');
    expect(result.config.decisions?.infra).toMatchObject({ proposed: 'vercel', decided: 'railway', decided_by: 'owner', note: 'needs a worker' });
    expect(files['ROADMAP.md']).toMatch(/owner OVERRODE it: needs a worker/);
    expect(files['CLAUDE.md']).toMatch(/Stamped profile:\*\* `deploy-railway`/);
  });

  test('the railway profile carries the contract it promises', () => {
    const { files } = buildNewProject('fresh-app', { infra: 'railway' });
    const toml = files['railway.toml'] as string;
    expect(toml).toMatch(/preDeployCommand = "npm run db:migrate:deploy/); // migrate before deploy, atomically
    expect(toml).toMatch(/healthcheckPath = "\/api\/health"/);
    const deploy = files['.github/workflows/deploy.yml'] as string;
    expect(deploy).toMatch(/environment: \$\{\{ github\.event\.inputs\.environment \|\| 'production' \}\}/); // the human gate
    expect(deploy).toMatch(/sync AVANI_STAGE "\$TARGET"/); // the stage convention is set per environment
    expect(deploy).toMatch(/api\/health/); // deployed means healthy
    const backup = files['.github/workflows/backup-production-db.yml'] as string;
    expect(backup).toMatch(/BACKUP_ENCRYPTION_PASSPHRASE/);
    expect(backup).toMatch(/Verify the dump restores/);
  });
});
