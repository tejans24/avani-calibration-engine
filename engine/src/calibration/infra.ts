import type { Dials } from '../schema/calibrated-config.js';
import type { IntakeProfile } from '../schema/intake-profile.js';

export type InfraTarget = Dials['infra'];

/** How an option stands for THIS intake, given what the engine could evaluate. */
export type InfraFit = 'recommended' | 'viable' | 'not-recommended';

/**
 * One option on the menu the owner decides from. Every target is always
 * listed — the owner sees the whole menu and what each choice costs, not just
 * the engine's pick — and each is explained twice: what it is (durable, from
 * the deploy profile in SPEC §4.2) and how it fits this intake (computed).
 */
export interface InfraOption {
  target: InfraTarget;
  fit: InfraFit;
  /** What it is, in a line (SPEC §4.2 runtime shape + database). */
  what: string;
  /** Why it fits — or doesn't — for this intake, naming the inputs read. */
  why: string;
  /** What you give up by choosing it. */
  tradeoffs: string;
  /** Shape of the bill, not a number: flat, usage cliffs, architecture-dependent. */
  cost_shape: string;
  /** Ops burden: who runs it. */
  ops_burden: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  /** The condition under which this option becomes the answer (SPEC §4.1 rule). Null for the recommended one. */
  becomes_the_answer_if: string | null;
  /** Whether a running system backs the profile row (SPEC §4.2 "shipped"). */
  evidence: 'shipped' | 'house-position';
}

/**
 * The engine's deploy-target *proposal* (SPEC §4.1). The engine never decides
 * the target: it applies the rules it can evaluate from the intake, says which
 * rule fired and what it could not consider, lists every option with its fit
 * and trade-offs, and names the runner-up so the owner sees the alternative
 * they are declining. The owner's decision is recorded next to it.
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
  /** The whole menu, recommended first, each option explained for this intake. */
  options: InfraOption[];
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

/** The durable half of every option: what it is and what it costs you. Mirrors SPEC §4.2. */
const CATALOG: Record<InfraTarget, Pick<InfraOption, 'what' | 'tradeoffs' | 'cost_shape' | 'ops_burden' | 'evidence'>> = {
  vercel: {
    what: 'Serverless Next.js hosting (functions + edge proxy) with a managed Postgres that branches per preview.',
    tradeoffs:
      'No long-lived process: websockets, background workers and in-process cron need another service. Two vendors for one app (host + database). Pricing has cliffs at roughly 10x scale.',
    cost_shape: 'Near-zero at small scale; usage-based with cliffs as traffic and function time grow.',
    ops_burden: 'lowest',
    evidence: 'house-position',
  },
  railway: {
    what: 'One long-lived container per service built from the repo, with a platform Postgres on a persistent volume; config as code; migrations run atomically before each release.',
    tradeoffs:
      'Single region; fewer compliance controls than a hyperscaler; per-PR previews are opt-in rather than native; the ecosystem is smaller when you need an unusual add-on.',
    cost_shape: 'Flat and predictable: a small fixed monthly amount that grows with allocated resources, not with requests.',
    ops_burden: 'low',
    evidence: 'shipped',
  },
  aws: {
    what: 'ECS Fargate service behind a load balancer with RDS Postgres in a private subnet, everything defined in CDK (Lambda only for an API-only Python service).',
    tradeoffs:
      'Costs a human sooner: someone owns IAM, networking and the CDK stack. First deploy is days, not minutes. Cost depends on the architecture you build, so it needs watching.',
    cost_shape: 'Architecture-dependent: a baseline for the load balancer, NAT and RDS even at zero traffic, then scales with what you provision.',
    ops_burden: 'high',
    evidence: 'house-position',
  },
  gcp: {
    what: 'Cloud Run service with Cloud SQL Postgres over private IP, defined in Terraform.',
    tradeoffs:
      'Same ops weight as AWS, and the house has less depth here — AWS is the default hyperscaler, so GCP is a client-pulled choice. Worth it when the workload is GCP-native (BigQuery, Vertex, Document AI).',
    cost_shape: 'Architecture-dependent; Cloud Run scales to zero, Cloud SQL does not.',
    ops_burden: 'high',
    evidence: 'house-position',
  },
  'self-hosted': {
    what: 'Docker Compose on a VM the client runs (Kubernetes only if the client already operates it); Postgres on the host with its own volume.',
    tradeoffs:
      'You are the platform: patching, uptime, backups, restore drills and on-call are yours. No managed previews or staging unless funded. Only ever a requirement, never a cost play.',
    cost_shape: 'Hardware or VM rental plus the human time to run it — the second term dominates.',
    ops_burden: 'highest',
    evidence: 'house-position',
  },
};

const RUNNER_UP: Record<InfraTarget, InfraTarget | null> = {
  vercel: 'railway',
  railway: 'vercel',
  aws: 'railway',
  gcp: 'aws',
  'self-hosted': 'railway',
};

const ORDER: InfraTarget[] = ['vercel', 'railway', 'aws', 'gcp', 'self-hosted'];

/** Build the full menu for this intake: the proposed target first, then the rest in tie-breaker order (cheapest to operate first). */
function assessOptions(intake: IntakeProfile, runtime: Dials['runtime'], proposed: InfraTarget, scaleSignal: boolean): InfraOption[] {
  const ops = intake.ops_capacity;
  const assessment: Record<InfraTarget, Pick<InfraOption, 'fit' | 'why' | 'becomes_the_answer_if'>> = {
    vercel:
      runtime === 'python'
        ? {
            fit: 'not-recommended',
            why: 'The runtime is Python: a persistent server, not a serverless Next.js app. Vercel would host the UI only and the API would still need a home.',
            becomes_the_answer_if: 'the app is re-scoped to a request/response Next.js app with no long-lived process (rule 4).',
          }
        : {
            fit: 'recommended',
            why: `Request/response Next.js app with ${ops} ops capacity and no long-lived process recorded — the lowest-ops target (rule 4).${scaleSignal ? ' A scale signal is present: check the pricing cliff before accepting.' : ''}`,
            becomes_the_answer_if: null,
          },
    railway:
      runtime === 'python'
        ? {
            fit: 'recommended',
            why: 'The runtime is Python: a persistent process with an attached Postgres, flat pricing and near-zero ops (rule 3). This is the shape of the shipped reference app.',
            becomes_the_answer_if: null,
          }
        : {
            fit: 'viable',
            why: `Same low ops as the recommendation, with a long-lived process and flat pricing; costs a little more at zero traffic and gives up native per-PR previews.${scaleSignal ? ' The flat bill is also the hedge against the PaaS pricing cliff.' : ''}`,
            becomes_the_answer_if: 'the app needs websockets/realtime, background workers or cron (rule 3), or the budget needs a flat predictable bill.',
          },
    aws: {
      fit: 'viable',
      why: `No existing-cloud, compliance, residency, private-networking or 100x signal is recorded, and it costs a human sooner with ${ops} ops capacity — so not proposed on what is known.`,
      becomes_the_answer_if: 'the client already runs AWS (rule 1), or a compliance regime, data residency, private networking or a 100x horizon applies (rule 2). Always with CDK.',
    },
    gcp: {
      fit: 'viable',
      why: 'Same ops weight as AWS with less house depth; nothing recorded pulls toward GCP.',
      becomes_the_answer_if: 'the client already runs GCP (rule 1) or the workload is GCP-native — BigQuery, Vertex, Document AI (rule 2).',
    },
    'self-hosted':
      ops === 'high'
        ? {
            fit: 'viable',
            why: 'Ops capacity is high, so it is operable — but nothing recorded requires it, and it is never chosen for cost.',
            becomes_the_answer_if: 'data may not leave client premises or a contract requires client hosting (rule 5).',
          }
        : {
            fit: 'not-recommended',
            why: `Ops capacity is ${ops}; self-hosting needs high — someone must own patching, backups and uptime.`,
            becomes_the_answer_if: 'data may not leave client premises (rule 5) AND the client funds the ops capacity to run it.',
          },
  };

  const rest = ORDER.filter((t) => t !== proposed);
  return [proposed, ...rest].map((target) => ({ target, ...CATALOG[target], ...assessment[target] }));
}

export function proposeInfra(intake: IntakeProfile, runtime: Dials['runtime']): InfraProposal {
  const unanswered = [...UNANSWERED_INPUTS];
  const scaleSignal = intake.peak_concurrent >= 500 || intake.client_count > 1;
  const scaleNote = scaleSignal
    ? ` Scale signal present (${intake.peak_concurrent} peak concurrent, ${intake.client_count} client org(s)): weigh the 10x tie-breaker against the PaaS pricing cliff before accepting.`
    : '';

  if (runtime === 'python') {
    const proposed: InfraTarget = 'railway';
    return {
      proposed,
      rule: 3,
      rationale: `runtime is python — a persistent server process with an attached Postgres, flat pricing, near-zero ops.${scaleNote}`,
      runner_up: 'aws',
      unanswered,
      options: assessOptions(intake, runtime, proposed, scaleSignal),
    };
  }

  const proposed: InfraTarget = 'vercel';
  return {
    proposed,
    rule: 4,
    rationale: `request/response Next.js app with ${intake.ops_capacity} ops capacity — lowest-ops target; app on Vercel with managed Postgres is the sanctioned split.${scaleNote}`,
    runner_up: RUNNER_UP.vercel,
    unanswered,
    options: assessOptions(intake, runtime, proposed, scaleSignal),
  };
}
