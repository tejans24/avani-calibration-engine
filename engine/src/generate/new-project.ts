import type { IntakeProfile } from '../schema/intake-profile.js';
import { SCHEMA_VERSION } from '../schema/version.js';
import { runPipeline, type PipelineResult } from '../pipeline.js';
import { stampBlueprints } from './blueprints.js';
import { generateProject } from './generate.js';
import type { FileMap } from './helpers.js';
import { buildRoadmapMd, buildRoutingPolicy } from './roadmap.js';

/**
 * `avani new` — self mode (VISION §19): the house preset, no interview. One
 * command -> the default stack, deterministic, zero LLM calls at runtime.
 */
export const APP_NAME_RE = /^[a-z][a-z0-9-]*$/;

/**
 * The house preset: a single-owner product app on the default stack. Facts are
 * deliberately quiet (no PII, no payments, no offline) so calibration lands on
 * standard correctness / medium sensitivity — dials drop to Auto, ship.
 */
export function selfPresetIntake(): IntakeProfile {
  return {
    schemaVersion: SCHEMA_VERSION,
    type: 'self-product',
    client_count: 0,
    user_count: 100,
    peak_concurrent: 10,
    annual_records: 10_000,
    roles: ['owner'],
    offline_required: false,
    has_pii: false,
    has_protected_geo: false,
    has_money_transactions: false,
    data_provenance_critical: false,
    timeline_weeks: 4,
    budget_usd: 0,
    ops_capacity: 'medium',
  };
}

/**
 * Build the complete new-project FileMap: stamped blueprint skeleton, then the
 * engine residue (CLAUDE.md, settings, invariant stubs — residue wins on any
 * path collision), then the execution layer (roadmap + routing policy).
 */
export function buildNewProject(name: string): { files: FileMap; result: PipelineResult } {
  if (!APP_NAME_RE.test(name)) {
    throw new Error(`invalid project name '${name}' — use lowercase letters, digits, and dashes (start with a letter)`);
  }

  const result = runPipeline(selfPresetIntake());
  const files: FileMap = {
    ...stampBlueprints(result.selection, { APP_NAME: name }),
    ...generateProject(result.config, result.selection),
    'ROADMAP.md': buildRoadmapMd(name),
    '.avani/routing-policy.json': `${JSON.stringify(buildRoutingPolicy(), null, 2)}\n`,
  };
  return { files, result };
}
