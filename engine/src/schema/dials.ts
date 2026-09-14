import { z } from 'zod';

/**
 * Calibration dials — the controlled vocabulary of the engine.
 *
 * These enums are the single source of truth: profile modules select from
 * them, the calibrated-config schema validates against them, and their
 * `.describe()` text becomes the generated documentation.
 */

export const CorrectnessBar = z
  .enum(['basic', 'standard', 'strict', 'append-only'])
  .describe('How rigorous correctness guarantees must be. Rises with money transactions or critical data provenance.');

export const Sensitivity = z
  .enum(['low', 'medium', 'high', 'protected'])
  .describe('How careful to be with the data. Intrinsic to the domain; scales hook severity at generation time.');

export const Infra = z
  .enum(['vercel', 'railway', 'aws', 'gcp', 'self-hosted'])
  .describe(
    'Deployment target for the app, chosen by the decision rules in SPEC §4.1 and realized by the matching deploy profile (SPEC §4.2). vercel: request/response Next.js apps, lowest ops. railway: apps that need a long-lived process (workers, websockets, cron) or flat predictable cost. aws / gcp: an existing client cloud, a compliance or residency regime, private networking, or a large scale horizon — always with infrastructure as code. self-hosted: data that may not leave client premises; needs high ops capacity.',
  );

export const Runtime = z
  .enum(['ts-nextjs', 'python'])
  .describe('Per-app runtime. ts-nextjs is the default for product/UI apps; python for small backend APIs, ML workflows, and data pipelines.');

export const Topology = z
  .enum(['single-app', 'monorepo'])
  .describe('Repo shape. monorepo when the project spans multiple apps (one monorepo per client project).');

/**
 * Stage is a MUTABLE dimension, not a calibration dial — it changes over the
 * project's life and is resolved on the ground (AVANI_STAGE env / branch), so
 * it is never stored in a calibrated-config. Defined here because it shares the
 * controlled vocabulary and validates the AVANI_STAGE signal.
 */
export const Stage = z
  .enum(['dev', 'staging', 'production'])
  .describe('Mutable lifecycle stage. Resolved on the ground; escalates enforcement dev -> staging -> production.');

export const RiskLevel = z
  .enum(['low', 'medium', 'high'])
  .describe('Qualitative risk/feasibility rating.');

export const OpsCapacity = z
  .enum(['low', 'medium', 'high'])
  .describe('How much operational capacity the owner has to run the system.');
