import { execSync } from 'node:child_process';

export type Stage = 'dev' | 'staging' | 'production';

/**
 * The AVANI_STAGE convention: explicit env var first, branch mapping as the
 * fallback (feature/* -> dev, main -> staging, tagged release -> production),
 * defaulting to dev.
 */
export function resolveStage(): Stage {
  const explicit = process.env.AVANI_STAGE;
  if (explicit === 'dev' || explicit === 'staging' || explicit === 'production') return explicit;

  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (branch === 'main') return 'staging';
  } catch {
    // Not a git checkout — fall through to dev.
  }
  return 'dev';
}

/** Hard gate for dev-only commands (seed, reset). Exits non-zero outside dev. */
export function assertDevStage(command: string): void {
  const stage = resolveStage();
  if (stage !== 'dev') {
    console.error(`${command} is dev-only; refusing to run at stage '${stage}'. (AVANI_STAGE guards this — do not bypass.)`);
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
