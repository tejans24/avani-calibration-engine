import { z } from 'zod';
import { OpsCapacity } from './dials.js';
import { SCHEMA_VERSION, SEMVER, isSupportedVersion } from './version.js';

/**
 * intake-profile — the structured output of the Intake layer.
 *
 * Raw, pre-calibration facts about the app. The boolean flags are the inputs
 * calibration reads to derive dials (e.g. has_money_transactions -> strict
 * correctness_bar; has_pii && has_protected_geo -> protected sensitivity).
 */
export const IntakeProfileSchema = z
  .object({
    schemaVersion: z.string().regex(SEMVER).describe('Schema version this document conforms to (semver).'),
    type: z.string().min(1).describe('Profile archetype, e.g. field-data-collection, saas, enterprise-tool.'),

    client_count: z.number().int().min(0).describe('Number of distinct client organizations served.'),
    user_count: z.number().int().min(0).describe('Expected total user count.'),
    peak_concurrent: z.number().int().min(0).describe('Expected peak concurrent users.'),
    annual_records: z.number().int().min(0).describe('Expected records created per year (sizing signal).'),

    roles: z.array(z.string().min(1)).min(1).describe('Distinct user roles, e.g. volunteer, coordinator, admin.'),

    offline_required: z.boolean().describe('Whether the app must function offline (drives offline plugins).'),
    has_pii: z.boolean().describe('Whether the app stores personally identifiable information.'),
    has_protected_geo: z.boolean().describe('Whether the app stores location data that must be protected (e.g. endangered species sites).'),
    has_money_transactions: z.boolean().describe('Whether the app handles payments or money movement.'),
    data_provenance_critical: z.boolean().describe('Whether an auditable, append-only record of data provenance is required.'),

    timeline_weeks: z.number().int().positive().describe('Target delivery timeline in weeks.'),
    budget_usd: z.number().min(0).describe('Project budget in USD.'),
    ops_capacity: OpsCapacity,
  })
  .describe('Structured, pre-calibration facts about an application, produced by the Intake layer.');

export type IntakeProfile = z.infer<typeof IntakeProfileSchema>;

/** Parse and version-check an intake profile. Throws on invalid or unsupported-major input. */
export function parseIntakeProfile(data: unknown): IntakeProfile {
  const parsed = IntakeProfileSchema.parse(data);
  if (!isSupportedVersion(parsed.schemaVersion)) {
    throw new Error(
      `intake-profile schemaVersion ${parsed.schemaVersion} is not supported by engine ${SCHEMA_VERSION} (major mismatch)`,
    );
  }
  return parsed;
}

export const safeParseIntakeProfile = (data: unknown) => IntakeProfileSchema.safeParse(data);
