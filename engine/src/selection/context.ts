import { z } from 'zod';
import { CorrectnessBar, Infra, Runtime, Sensitivity, Topology } from '../schema/dials.js';

/**
 * The input to the selection layer.
 *
 * Selection reads the resolved dials plus a small set of derived boolean
 * `signals` — feature facts (offline, geo, payments, auth) that drive plugin
 * and blueprint selection beyond what the dials alone capture. Calibration
 * produces this context from the intake profile.
 */
export const SelectionSignalsSchema = z
  .object({
    offline_required: z.boolean().default(false).describe('App must function offline.'),
    has_protected_geo: z.boolean().default(false).describe('App stores protected location data.'),
    has_payments: z.boolean().default(false).describe('App handles payments or money movement.'),
    auth_clerk: z.boolean().default(false).describe('App uses Clerk-based authentication.'),
  })
  .describe('Boolean feature signals derived from intake that drive selection beyond the dials.');

export const SelectionContextSchema = z
  .object({
    profile: z.string().min(1).describe('Profile the calibration ran under, e.g. field-app.'),
    dials: z
      .object({
        correctness_bar: CorrectnessBar,
        sensitivity: Sensitivity,
        infra: Infra,
        runtime: Runtime,
        topology: Topology,
      })
      .describe('Resolved calibration dials.'),
    signals: SelectionSignalsSchema.default({
      offline_required: false,
      has_protected_geo: false,
      has_payments: false,
      auth_clerk: false,
    }),
  })
  .describe('The selection layer input: dials plus derived feature signals.');

export type SelectionSignals = z.infer<typeof SelectionSignalsSchema>;
export type SelectionContext = z.infer<typeof SelectionContextSchema>;

export const parseSelectionContext = (data: unknown): SelectionContext => SelectionContextSchema.parse(data);
