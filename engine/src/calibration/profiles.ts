import type { Dials } from '../schema/calibrated-config.js';
import type { IntakeProfile } from '../schema/intake-profile.js';
import type { SelectionSignals } from '../selection/context.js';
import { deriveDials, deriveSignals } from './derive.js';

/**
 * A profile module maps an intake profile to dials + signals. Profiles let
 * different app archetypes diverge in their calibration judgment; today they
 * share the base derivation, and the seam is here for when they need to differ.
 */
export interface ProfileModule {
  name: string;
  matches: (intakeType: string) => boolean;
  calibrate: (intake: IntakeProfile) => { dials: Dials; signals: SelectionSignals };
}

const base = (intake: IntakeProfile) => ({ dials: deriveDials(intake), signals: deriveSignals(intake) });

export const FIELD_APP: ProfileModule = {
  name: 'field-app',
  matches: (t) => /field/i.test(t),
  calibrate: base,
};

/** Fallback profile — matches anything. */
export const GENERIC: ProfileModule = {
  name: 'generic',
  matches: () => true,
  calibrate: base,
};

export const PROFILES: readonly ProfileModule[] = [FIELD_APP, GENERIC];

/** Resolve the profile module for an intake `type`, falling back to generic. */
export function resolveProfile(intakeType: string): ProfileModule {
  return PROFILES.find((p) => p.matches(intakeType)) ?? GENERIC;
}
