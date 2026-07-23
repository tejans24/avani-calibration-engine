import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { CalibratedConfig } from '../schema/calibrated-config.js';
import type { Selection } from '../selection/select.js';
import { buildClaudeMd } from './claudemd.js';
import type { FileMap } from './helpers.js';
import { buildInvariantTests } from './invariant-tests.js';
import { buildManifest } from './manifest.js';
import { buildMcpConfig } from './mcp.js';
import { buildSettings } from './settings.js';

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/**
 * Generate the project artifacts from a calibrated config + its selection.
 * Returns an in-memory map of repo-relative path -> content (blueprint file
 * stamping is Phase-1 work; selected blueprints are recorded in the manifest).
 */
export function generateProject(config: CalibratedConfig, selection: Selection): FileMap {
  const files: FileMap = {
    '.claude/settings.json': json(buildSettings(config, selection)),
    'CLAUDE.md': buildClaudeMd(config, selection),
    '.mcp.json': json(buildMcpConfig(config, selection)),
    '.avani/manifest.json': json(buildManifest(config, selection)),
  };
  Object.assign(files, buildInvariantTests(config));
  return files;
}

/** Write a generated FileMap under `outDir`, creating parent directories. Returns paths written (sorted). */
export function writeProject(files: FileMap, outDir: string): string[] {
  const written: string[] = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(outDir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    written.push(rel);
  }
  return written.sort();
}
