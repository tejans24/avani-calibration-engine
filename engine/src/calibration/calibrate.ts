import type { IntakeProfile } from '../schema/intake-profile.js';
import { SelectionContextSchema, type SelectionContext } from '../selection/context.js';
import { resolveProfile } from './profiles.js';

/** Calibrate an intake profile into a selection context (profile + dials + signals). */
export function calibrate(intake: IntakeProfile): SelectionContext {
  const profile = resolveProfile(intake.type);
  const { dials, signals } = profile.calibrate(intake);
  return SelectionContextSchema.parse({ profile: profile.name, dials, signals });
}
