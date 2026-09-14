import type { Dials } from '../schema/calibrated-config.js';
import type { IntakeProfile } from '../schema/intake-profile.js';

export type InfraTarget = Dials['infra'];

/**
 * The engine's deploy-target *proposal* (SPEC §4.1). The engine never decides
 * the target: it applies the rules it can evaluate from the intake, says which
 * rule fired and what it could not consider, and names the runner-up so the
 * owner sees the alternative they are declining. The owner's decision is
 * recorded next to it (see `InfraDecision`).
 */
export interface InfraProposal {
  proposed: InfraTarget;
  /** The §4.1 rule that fired. */
  rule: number;
  rationale: string;
  /** Next-best admissible target under the tie-breakers. */
  runner_up: InfraTarget | null;
  /** §4.1 inputs the intake profile cannot answer yet; the owner must weigh them before accepting. */
  unanswered: string[];
}

/** The owner's decision. `by` is deliberately a closed set: only a human decides. */
export interface InfraDecision {
  target: InfraTarget;
  by: 'owner';
  note?: string;
}

/**
 * Inputs §4.1 reads that the intake profile does not carry yet (VISION §20
 * phase C). Listed on every proposal so a decision is never made in false
 * confidence — the rules that depend on these (1, 2, 5, and the realtime /
 * background-job clause of 3) simply could not fire.
 */
export const UNANSWERED_INPUTS = [
  'existing_cloud (rule 1: a client cloud with procurement and IAM in place)',
  'compliance_regime / data_residency / private_networking (rule 2)',
  'scale_horizon (rule 2 at 100x; tie-breaker at 10x)',
  'needs_realtime / needs_background_jobs (rule 3: long-lived process)',
  'on_premises_required (rule 5)',
] as const;

const RUNNER_UP: Record<InfraTarget, InfraTarget | null> = {
  vercel: 'railway',
  railway: 'vercel',
  aws: 'railway',
  gcp: 'aws',
  'self-hosted': 'railway',
};

export function proposeInfra(intake: IntakeProfile, runtime: Dials['runtime']): InfraProposal {
  const unanswered = [...UNANSWERED_INPUTS];
  const scaleNote =
    intake.peak_concurrent >= 500 || intake.client_count > 1
      ? ` Scale signal present (${intake.peak_concurrent} peak concurrent, ${intake.client_count} client org(s)): weigh the 10x tie-breaker against the PaaS pricing cliff before accepting.`
      : '';

  if (runtime === 'python') {
    return {
      proposed: 'railway',
      rule: 3,
      rationale: `runtime is python — a persistent server process with an attached Postgres, flat pricing, near-zero ops.${scaleNote}`,
      runner_up: 'aws',
      unanswered,
    };
  }

  return {
    proposed: 'vercel',
    rule: 4,
    rationale: `request/response Next.js app with ${intake.ops_capacity} ops capacity — lowest-ops target; app on Vercel with managed Postgres is the sanctioned split.${scaleNote}`,
    runner_up: RUNNER_UP.vercel,
    unanswered,
  };
}
