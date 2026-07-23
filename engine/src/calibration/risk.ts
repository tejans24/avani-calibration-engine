import type { RiskAssessment } from '../schema/calibrated-config.js';
import type { IntakeProfile } from '../schema/intake-profile.js';

const INFRA_MONTHLY_USD = 50; // vercel default

/** Derive a feasibility / cost / timeline assessment from the intake profile. */
export function deriveRisk(intake: IntakeProfile): RiskAssessment {
  const majorSignals = [intake.offline_required, intake.has_protected_geo, intake.has_money_transactions].filter(Boolean).length;

  const estimated_budget_usd = 100 + 25 * majorSignals;
  const neededWeeks = 4 + 2 * majorSignals;
  const ratio = intake.timeline_weeks / neededWeeks;

  const timeline_risk: RiskAssessment['timeline_risk'] = ratio >= 1 ? 'low' : ratio >= 0.66 ? 'medium' : 'high';
  const feasibility: RiskAssessment['feasibility'] = timeline_risk === 'high' ? 'medium' : 'high';

  const mitigations: string[] = [];
  if (timeline_risk !== 'low') mitigations.push('start_with_mvp');
  if (intake.roles.includes('admin')) mitigations.push('defer_admin_dashboard');

  return { feasibility, estimated_budget_usd, estimated_infra_monthly_usd: INFRA_MONTHLY_USD, timeline_risk, mitigations };
}
