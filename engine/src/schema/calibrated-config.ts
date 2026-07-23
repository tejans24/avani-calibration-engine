import { z } from 'zod';
import { CorrectnessBar, Infra, RiskLevel, Runtime, Sensitivity, Topology } from './dials.js';
import { SCHEMA_VERSION, SEMVER, isSupportedVersion } from './version.js';

/**
 * calibrated-config — the output of the Calibration + Selection layers.
 *
 * The contract every downstream generator reads. `dials` is the controlled
 * vocabulary; `invariants` and `patterns` name the guarantees and stack pieces
 * selected from those dials.
 */

export const DialsSchema = z
  .object({
    correctness_bar: CorrectnessBar,
    sensitivity: Sensitivity,
    infra: Infra,
    runtime: Runtime,
    topology: Topology,
  })
  .describe('The resolved calibration dials for the app.');

export const RiskAssessmentSchema = z
  .object({
    feasibility: RiskLevel.describe('Overall feasibility rating.'),
    estimated_budget_usd: z.number().min(0).describe('Estimated token/build budget in USD.'),
    estimated_infra_monthly_usd: z.number().min(0).describe('Estimated monthly infrastructure cost in USD.'),
    timeline_risk: RiskLevel.describe('Risk that the timeline slips.'),
    mitigations: z.array(z.string().min(1)).describe('Recommended risk mitigations, e.g. start_with_mvp.'),
  })
  .describe('Feasibility, cost, and timeline assessment for the calibrated app.');

export const CalibratedConfigSchema = z
  .object({
    schemaVersion: z.string().regex(SEMVER).describe('Schema version this document conforms to (semver).'),
    profile: z.string().min(1).describe('Profile name the calibration was run under, e.g. field-app.'),
    dials: DialsSchema,
    invariants: z.array(z.string().min(1)).describe('Named invariants to enforce (exact-match keys, e.g. observations_append_only_never_delete).'),
    patterns: z.array(z.string().min(1)).describe('Named stack patterns to inject, e.g. nextjs-app-router.'),
    risk_assessment: RiskAssessmentSchema,
  })
  .describe('The calibrated configuration produced from an intake profile: dials, invariants, patterns, and risk.');

export type Dials = z.infer<typeof DialsSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
export type CalibratedConfig = z.infer<typeof CalibratedConfigSchema>;

/** Parse and version-check a calibrated config. Throws on invalid or unsupported-major input. */
export function parseCalibratedConfig(data: unknown): CalibratedConfig {
  const parsed = CalibratedConfigSchema.parse(data);
  if (!isSupportedVersion(parsed.schemaVersion)) {
    throw new Error(
      `calibrated-config schemaVersion ${parsed.schemaVersion} is not supported by engine ${SCHEMA_VERSION} (major mismatch)`,
    );
  }
  return parsed;
}

export const safeParseCalibratedConfig = (data: unknown) => CalibratedConfigSchema.safeParse(data);
