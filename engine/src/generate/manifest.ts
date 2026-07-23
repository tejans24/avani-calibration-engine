import type { CalibratedConfig } from '../schema/calibrated-config.js';
import { SCHEMA_VERSION } from '../schema/version.js';
import { SELECTION_VERSION } from '../selection/catalog.js';
import type { Selection } from '../selection/select.js';
import { ENGINE_VERSION, byKind } from './helpers.js';

/**
 * Project metadata for reproducibility (SPEC §7.2). Versions only — no
 * timestamp or git sha, so generation stays deterministic and golden-testable;
 * a caller can stamp those in afterward.
 */
export function buildManifest(config: CalibratedConfig, selection: Selection): Record<string, unknown> {
  return {
    engine_version: ENGINE_VERSION,
    schema_version: SCHEMA_VERSION,
    selection_version: SELECTION_VERSION,
    profile: config.profile,
    dials: config.dials,
    plugins: byKind(selection, 'plugin'),
    blueprints: byKind(selection, 'blueprint'),
  };
}
