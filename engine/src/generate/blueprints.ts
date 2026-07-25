import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
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

export interface StampVars {
  /** Substituted for every `{{APP_NAME}}` occurrence in template files. */
  APP_NAME: string;
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
 * Stamp one blueprint: read templates/<name>/files/** verbatim, apply the
 * rename map and `{{APP_NAME}}` substitution. Deterministic by construction —
 * same template + same vars -> byte-identical output.
 */
export function stampBlueprint(name: string, vars: StampVars): FileMap {
  const filesRoot = join(TEMPLATES_ROOT, name, 'files');
  if (!existsSync(filesRoot)) throw new Error(`blueprint '${name}' has no template files at ${filesRoot}`);

  const files: FileMap = {};
  for (const rel of listFiles(filesRoot)) {
    const target = STAMP_RENAMES[rel] ?? rel;
    files[target] = substitute(readFileSync(join(filesRoot, rel), 'utf8'), vars);
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
