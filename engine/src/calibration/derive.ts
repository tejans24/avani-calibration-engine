import type { Dials } from '../schema/calibrated-config.js';
import type { IntakeProfile } from '../schema/intake-profile.js';
import type { SelectionSignals } from '../selection/context.js';

/**
 * The dial-derivation rules: intake facts -> calibration dials.
 *
 * This is the engineering judgment the engine encodes. Kept as typed code (not
 * a JSON DSL) so the rules are checked and debuggable.
 */
export function deriveDials(intake: IntakeProfile): Dials {
  const correctness_bar: Dials['correctness_bar'] = intake.data_provenance_critical
    ? 'append-only'
    : intake.has_money_transactions
      ? 'strict'
      : 'standard';

  const sensitivity: Dials['sensitivity'] = intake.has_pii && intake.has_protected_geo
    ? 'protected'
    : intake.has_pii
      ? 'high'
      : 'medium';

  return {
    correctness_bar,
    sensitivity,
    // Cost-sensitive default; enterprise/self-hosted branches come later.
    infra: 'vercel',
    // Product/UI default; a python-primary profile would override.
    runtime: 'ts-nextjs',
    // No multi-app signal in the intake profile yet.
    topology: 'single-app',
    walkthrough: deriveWalkthrough(intake),
  };
}

/**
 * How much walkthrough a project gets. A human review of every flow pays off
 * in proportion to who will use the screens: nothing to walk without a UI or
 * for a throwaway, a screenshot page for staff tools, and the live guided tour
 * on realistic data for anything customers or clients touch.
 */
export function deriveWalkthrough(intake: IntakeProfile): Dials['walkthrough'] {
  if (intake.prototype || intake.audience === 'none') return 'off';
  return intake.audience === 'internal' ? 'screenshots' : 'live';
}

/**
 * Derived boolean feature signals that drive selection beyond the dials.
 * `auth_clerk` is a judgment call: an app with more than one role needs
 * role-based access, and Clerk is the standard choice.
 */
export function deriveSignals(intake: IntakeProfile): SelectionSignals {
  return {
    offline_required: intake.offline_required,
    has_protected_geo: intake.has_protected_geo,
    has_payments: intake.has_money_transactions,
    auth_clerk: intake.roles.length > 1,
  };
}
