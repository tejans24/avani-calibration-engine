// Loading .env here (not in each caller) means no guard can ever run without
// it — resolveStage must see AVANI_STAGE from .env, not just the shell.
import 'dotenv/config';
import { execSync } from 'node:child_process';

export type Stage = 'dev' | 'staging' | 'production';

export interface StageInfo {
  stage: Stage;
  /** False only when nothing signalled the stage and 'dev' is a pure default. */
  explicit: boolean;
}

/**
 * The AVANI_STAGE convention: explicit env var first, branch mapping as the
 * fallback (main -> staging, any other real branch -> dev), defaulting to dev.
 * The default is tracked as non-explicit so destructive guards can fail closed
 * when nothing actually signalled "dev" (e.g. a prod container with no env var
 * and no git checkout).
 */
export function resolveStageInfo(): StageInfo {
  const explicit = process.env.AVANI_STAGE;
  if (explicit === 'dev' || explicit === 'staging' || explicit === 'production') {
    return { stage: explicit, explicit: true };
  }

  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (branch === 'main') return { stage: 'staging', explicit: true };
    // A real working branch is a genuine dev signal; detached HEAD ("HEAD") is not.
    if (branch && branch !== 'HEAD') return { stage: 'dev', explicit: true };
  } catch {
    // Not a git checkout — fall through to the non-explicit default.
  }
  return { stage: 'dev', explicit: false };
}

export function resolveStage(): Stage {
  return resolveStageInfo().stage;
}

/** Unparseable URLs count as remote — the guard fails closed. */
function dbHostIsLocal(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) return true; // nothing to protect; the command will fail on its own
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

/**
 * Hard gate for dev-only commands (seed, reset). Refuses outside dev, and also
 * refuses when "dev" is only a default (no AVANI_STAGE, no branch) while
 * DATABASE_URL points at a non-local host — the prod-container-without-env-var
 * case must never pass a destructive guard by omission.
 */
export function assertDevStage(command: string): void {
  const { stage, explicit } = resolveStageInfo();
  if (stage !== 'dev') {
    console.error(`${command} is dev-only; refusing to run at stage '${stage}'. (AVANI_STAGE guards this — do not bypass.)`);
    process.exit(1);
  }
  if (!explicit && !dbHostIsLocal()) {
    console.error(
      `${command} refused: stage fell back to 'dev' by default (no AVANI_STAGE, no git branch) but DATABASE_URL points at a non-local host. Set AVANI_STAGE explicitly if this is really a dev database.`,
    );
    process.exit(1);
  }
}

/** Gate for demo seeding: anywhere but production. */
export function assertNotProduction(command: string): void {
  const stage = resolveStage();
  if (stage === 'production') {
    console.error(`${command} must never run in production; refusing.`);
    process.exit(1);
  }
}
