import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { WALKTHROUGH_LEVELS } from '../schema/dials.js';
import type { Selection } from '../selection/select.js';
import { byKind, type FileMap } from './helpers.js';

const TEMPLATES_ROOT = join(import.meta.dirname, '..', '..', '..', 'templates');

/**
 * Filenames that cannot be stored verbatim inside templates/ (a real .gitignore
 * would change this repo's git behavior; root .gitignore excludes .env.*), so
 * they are committed un-dotted and renamed at stamp time.
 */
const STAMP_RENAMES: Record<string, string> = {
  gitignore: '.gitignore',
  'env.example': '.env.example',
};

export type WalkthroughLevel = (typeof WALKTHROUGH_LEVELS)[number];

export interface StampVars {
  /** Substituted for every `{{APP_NAME}}` occurrence in template files. */
  APP_NAME: string;
  /** The walkthrough dial: which walkthrough files, scripts and blocks are stamped. Default: live. */
  WALKTHROUGH?: WalkthroughLevel;
}

/**
 * A condition on the dials, written `walkthrough>=<level>` (levels ordered
 * off < screenshots < live). The only dial blueprints branch on today.
 */
export function conditionHolds(condition: string, vars: StampVars): boolean {
  const m = /^walkthrough>=(\w+)$/.exec(condition.trim());
  const needed = m ? WALKTHROUGH_LEVELS.indexOf(m[1] as WalkthroughLevel) : -1;
  if (needed < 0) throw new Error(`unknown stamp condition '${condition}'`);
  return WALKTHROUGH_LEVELS.indexOf(vars.WALKTHROUGH ?? 'live') >= needed;
}

const BLOCK_START = /avani:if\s+(\S+)/;
const BLOCK_END = /avani:end\b/;

/**
 * Conditional blocks inside template files: the lines between a line holding
 * `avani:if <condition>` and one holding `avani:end` (in whatever comment
 * syntax the file uses) are kept only when the condition holds. The marker
 * lines themselves never reach a project. Blocks do not nest.
 */
export function applyBlocks(content: string, vars: StampVars, file = 'template'): string {
  const out: string[] = [];
  let keep: boolean | null = null;
  for (const line of content.split('\n')) {
    const start = BLOCK_START.exec(line);
    if (start) {
      if (keep !== null) throw new Error(`${file}: nested avani:if`);
      keep = conditionHolds(start[1]!, vars);
    } else if (BLOCK_END.test(line)) {
      if (keep === null) throw new Error(`${file}: avani:end without avani:if`);
      keep = null;
    } else if (keep !== false) {
      out.push(line);
    }
  }
  if (keep !== null) throw new Error(`${file}: avani:if without avani:end`);
  return out.join('\n');
}

/**
 * templates/<name>/stamp.json: which files (by path or directory prefix) and
 * package.json scripts need which condition. Optional — a blueprint without
 * one stamps everything.
 */
interface StampRules {
  files?: Record<string, string>;
  scripts?: Record<string, string>;
}

function stampRules(name: string): StampRules {
  const path = join(TEMPLATES_ROOT, name, 'stamp.json');
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as StampRules) : {};
}

function fileWanted(rel: string, rules: StampRules, vars: StampVars): boolean {
  return Object.entries(rules.files ?? {}).every(([prefix, condition]) =>
    rel === prefix || rel.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`) ? conditionHolds(condition, vars) : true,
  );
}

function pruneScripts(content: string, rules: StampRules, vars: StampVars): string {
  const dropped = Object.entries(rules.scripts ?? {}).filter(([, condition]) => !conditionHolds(condition, vars));
  if (!dropped.length) return content;
  const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
  for (const [script] of dropped) delete pkg.scripts?.[script];
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

/**
 * Host port for the app's dev Postgres, derived deterministically from the app
 * name (`{{DB_PORT}}` in templates). Two generated apps on one machine get
 * different ports instead of colliding on 5432; the same name always maps to
 * the same port, keeping stamping deterministic.
 */
export function dbPortFor(appName: string): number {
  let h = 0;
  for (const ch of appName) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return 5433 + (h % 512);
}

function listFiles(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

const substitute = (content: string, vars: StampVars): string =>
  content.replaceAll('{{APP_NAME}}', vars.APP_NAME).replaceAll('{{DB_PORT}}', String(dbPortFor(vars.APP_NAME)));

/** Whether a blueprint has stampable template files yet (some are still planned). */
export function blueprintHasFiles(name: string): boolean {
  return existsSync(join(TEMPLATES_ROOT, name, 'files'));
}

/**
 * Stamp one blueprint: read templates/<name>/files/**, drop files and scripts
 * whose stamp.json condition fails, keep or drop `avani:if` blocks, then apply
 * the rename map and `{{APP_NAME}}` substitution. Deterministic by
 * construction — same template + same vars -> byte-identical output.
 */
export function stampBlueprint(name: string, vars: StampVars): FileMap {
  const filesRoot = join(TEMPLATES_ROOT, name, 'files');
  if (!existsSync(filesRoot)) throw new Error(`blueprint '${name}' has no template files at ${filesRoot}`);

  const rules = stampRules(name);
  const files: FileMap = {};
  for (const rel of listFiles(filesRoot)) {
    if (!fileWanted(rel, rules, vars)) continue;
    const target = STAMP_RENAMES[rel] ?? rel;
    let content = applyBlocks(readFileSync(join(filesRoot, rel), 'utf8'), vars, rel);
    if (rel === 'package.json') content = pruneScripts(content, rules, vars);
    files[target] = substitute(content, vars);
  }
  return files;
}

/** Stamp every selected blueprint that has template files, in selection order. */
export function stampBlueprints(selection: Selection, vars: StampVars): FileMap {
  const files: FileMap = {};
  for (const name of byKind(selection, 'blueprint')) {
    if (blueprintHasFiles(name)) Object.assign(files, stampBlueprint(name, vars));
  }
  return files;
}
