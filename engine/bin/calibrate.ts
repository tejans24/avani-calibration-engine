#!/usr/bin/env tsx
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { parseIntakeProfile } from '../src/schema/intake-profile.js';
import { runPipeline } from '../src/pipeline.js';
import { stampBlueprints } from '../src/generate/blueprints.js';
import { generateProject, writeProject } from '../src/generate/generate.js';
import { APP_NAME_RE, buildNewProject } from '../src/generate/new-project.js';

const SUBCOMMANDS = ['new', 'init', 'calibrate', 'generate', 'stage', 'sync', 'handoff', 'retro'] as const;
type Subcommand = (typeof SUBCOMMANDS)[number];

const USAGE = `avani calibration engine (v0.5 — new/calibrate/generate are live; other commands stubbed)

Usage: calibrate <subcommand>

  new <name>                 One-command project from the house preset (self mode, no interview);
                             --out <dir> (default: ./<name>)
  init                       Start intake for a new project
  calibrate <intake.json>    Run intake -> dials + selection -> calibrated-config
  generate <intake.json>     Emit project artifacts (default: ./.staging), --out <dir> --name <app>
  stage                      Show / promote project stage (dev -> staging -> production)
  sync                       Re-stamp blueprints from current templates (diff + approve)
  handoff                    Produce a deliverable variant (--strip for code-only)
  retro                      Compare engine decisions vs. overrides

Exit codes: 0 success, 1 validation failure, 2 review rejected
`;

const KIND_LABEL: Record<string, string> = { plugin: 'Plugins', blueprint: 'Blueprints', invariant: 'Invariants', pattern: 'Patterns' };

function runCalibrate(intakePath: string | undefined, asJson: boolean): number {
  if (!intakePath) {
    console.error('usage: calibrate calibrate <intake-profile.json> [--json]');
    return 1;
  }
  let intake;
  try {
    intake = parseIntakeProfile(JSON.parse(readFileSync(intakePath, 'utf8')));
  } catch (err) {
    console.error(`Invalid intake profile: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  const { context, selection, config } = runPipeline(intake);

  if (asJson) {
    console.log(JSON.stringify(config, null, 2));
    return 0;
  }

  console.log(`\nProfile:  ${context.profile}`);
  console.log('Dials:');
  for (const [k, v] of Object.entries(context.dials)) console.log(`  ${k.padEnd(16)} ${v}`);
  console.log('Signals:');
  for (const [k, v] of Object.entries(context.signals)) console.log(`  ${k.padEnd(20)} ${v}`);

  console.log('\nSelected:');
  for (const kind of ['plugin', 'blueprint', 'invariant', 'pattern']) {
    const items = selection.provisions.filter((p) => p.kind === kind);
    if (!items.length) continue;
    console.log(`  ${KIND_LABEL[kind]}:`);
    for (const p of items) {
      const shared = (selection.byProvision[p.id]?.length ?? 0) > 1 ? ' (shared)' : '';
      console.log(`    - ${p.id.split(':')[1]}${shared}`);
    }
  }

  const risk = config.risk_assessment;
  console.log(`\nRisk:     feasibility=${risk.feasibility}, budget=$${risk.estimated_budget_usd}, infra=$${risk.estimated_infra_monthly_usd}/mo, timeline_risk=${risk.timeline_risk}`);
  if (risk.mitigations.length) console.log(`          mitigations: ${risk.mitigations.join(', ')}`);
  console.log('');
  return 0;
}

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function runGenerate(argv: string[]): number {
  const intakePath = argv[1] && !argv[1].startsWith('--') ? argv[1] : undefined;
  if (!intakePath) {
    console.error('usage: calibrate generate <intake-profile.json> [--out <dir>]');
    return 1;
  }
  const outDir = argValue(argv, '--out') ?? '.staging';
  let intake;
  try {
    intake = parseIntakeProfile(JSON.parse(readFileSync(intakePath, 'utf8')));
  } catch (err) {
    console.error(`Invalid intake profile: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  const { config, selection } = runPipeline(intake);
  const files = generateProject(config, selection);
  if (argv.includes('--stamp')) {
    const name = argValue(argv, '--name') ?? 'app';
    Object.assign(files, { ...stampBlueprints(selection, { APP_NAME: name }), ...files });
  }
  const written = writeProject(files, outDir);
  console.log(`\nGenerated ${written.length} files into ${outDir}/:`);
  for (const path of written) console.log(`  ${path}`);
  console.log('');
  return 0;
}

function runNew(argv: string[]): number {
  const name = argv[1] && !argv[1].startsWith('--') ? argv[1] : undefined;
  if (!name || !APP_NAME_RE.test(name)) {
    console.error('usage: calibrate new <name> [--out <dir>]  (name: lowercase letters, digits, dashes)');
    return 1;
  }
  const outDir = resolve(argValue(argv, '--out') ?? name);
  if (existsSync(outDir) && readdirSync(outDir).length > 0) {
    console.error(`refusing to generate into non-empty directory: ${outDir}`);
    return 1;
  }

  const { files, result } = buildNewProject(name);
  const written = writeProject(files, outDir);

  console.log(`\n${name} — generated from the house preset (self mode, ${result.context.dials.runtime}).`);
  console.log(`${written.length} files in ${outDir}/\n`);
  console.log('Next steps:');
  console.log(`  cd ${basename(outDir) === name ? name : outDir}`);
  console.log('  npm install');
  console.log('  npm run dev        # starts postgres, migrates, seeds, runs the app');
  console.log('\nThen open ROADMAP.md and take task 1: replace the exemplar domain with yours.\n');
  return 0;
}

export function run(argv: string[]): number {
  const cmd = argv[0];
  if (cmd === undefined || cmd === '--help' || cmd === '-h') {
    console.log(USAGE);
    return 0;
  }
  if (!SUBCOMMANDS.includes(cmd as Subcommand)) {
    console.error(`Unknown subcommand: ${cmd}\n\n${USAGE}`);
    return 1;
  }
  if (cmd === 'new') return runNew(argv);
  if (cmd === 'calibrate') return runCalibrate(argv[1], argv.includes('--json'));
  if (cmd === 'generate') return runGenerate(argv);
  console.log(`'${cmd}' is not implemented yet — see SPEC.md §12 for the roadmap.`);
  return 0;
}

if (process.argv[1]?.endsWith('calibrate.ts')) {
  process.exit(run(process.argv.slice(2)));
}
