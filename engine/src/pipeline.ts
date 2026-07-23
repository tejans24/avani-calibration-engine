import { calibrate } from './calibration/calibrate.js';
import { deriveRisk } from './calibration/risk.js';
import { CalibratedConfigSchema, type CalibratedConfig } from './schema/calibrated-config.js';
import type { IntakeProfile } from './schema/intake-profile.js';
import { SCHEMA_VERSION } from './schema/version.js';
import type { SelectionContext } from './selection/context.js';
import { select, type Selection } from './selection/select.js';

const shortName = (id: string): string => id.split(':')[1] ?? id;

export interface PipelineResult {
  context: SelectionContext;
  selection: Selection;
  config: CalibratedConfig;
}

/**
 * The end-to-end pipeline: intake profile -> calibrated context -> selected
 * provisions -> assembled, schema-valid calibrated-config.
 *
 * Note who produces what: calibration yields dials + signals; selection yields
 * the invariants and patterns; the calibrated-config is *assembled* from both
 * plus a risk assessment — which is what finally makes something produce the
 * invariants list (first-review finding #8).
 */
export function runPipeline(intake: IntakeProfile): PipelineResult {
  const context = calibrate(intake);
  const selection = select(context);

  const config = CalibratedConfigSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    profile: context.profile,
    dials: context.dials,
    invariants: selection.provisions.filter((p) => p.kind === 'invariant').map((p) => shortName(p.id)),
    patterns: selection.provisions.filter((p) => p.kind === 'pattern').map((p) => shortName(p.id)),
    risk_assessment: deriveRisk(intake),
  });

  return { context, selection, config };
}
