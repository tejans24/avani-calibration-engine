/**
 * Test login: sign everyone in as a made-up user, without the real auth
 * provider, so automated tests and a human walking through the app reach every
 * signed-in screen. Everyone who reaches the server is that user, so it is off
 * unless asked for and refuses anywhere it could be reached by someone else or
 * touch real data:
 *
 *  - `TEST_LOGIN` has to be set: `on` (the default role) or a role name
 *    (`admin`, `coordinator`…) to be signed in as that role's test user.
 *  - `AVANI_STAGE` must say `dev`, explicitly. Unset fails closed, so a
 *    deploy that forgot its stage never hands out logins.
 *  - Never on Vercel, whatever else says.
 *  - Only against a database on this machine, so a laptop pointed at a shared
 *    or production database cannot sign anyone in over real data.
 *
 * It swaps WHO is signed in, never WHAT they may do: the test user goes
 * through the same membership and permission code as a real one.
 *
 * Unlike a check on NODE_ENV, these rules let the e2e suite run against the
 * production build (`next start`) on a CI runner: the build under test is the
 * one that ships. Pure (env in, answer out) so the gate is unit-tested;
 * src/lib/auth.ts and src/middleware.ts are the only places that act on it.
 */
export type TestLoginEnv = Record<string, string | undefined>;

const OFF = ['', 'off', '0', 'false', 'no'];
const ON = ['on', '1', 'true', 'yes'];
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];
const ROLE = /^[a-z][a-z0-9-]{0,30}$/;
export const DEFAULT_TEST_ROLE = 'owner';

/** Why test login is off, or null when it is on. */
export function testLoginProblem(env: TestLoginEnv): string | null {
  const asked = (env['TEST_LOGIN'] ?? '').trim().toLowerCase();
  if (OFF.includes(asked)) return 'TEST_LOGIN is not set.';
  if (!ON.includes(asked) && !ROLE.test(asked)) return `TEST_LOGIN must be "on" or a role name, not "${asked}".`;
  if ((env['AVANI_STAGE'] ?? '').trim() !== 'dev') return 'Only when AVANI_STAGE is explicitly "dev".';
  if ((env['VERCEL'] ?? '').trim() || (env['VERCEL_ENV'] ?? '').trim()) return 'Never on Vercel.';
  let host = '';
  try {
    host = new URL(env['DATABASE_URL'] ?? '').hostname.toLowerCase();
  } catch {
    return 'DATABASE_URL is missing or unreadable.';
  }
  if (!LOCAL_HOSTS.includes(host)) return `Only against a database on this machine, and this one is at ${host}.`;
  return null;
}

/** The made-up user for a role. One per role, so switching roles never reuses a membership. */
export function testUserId(role: string): string {
  return `test-${role}`;
}

/** The test identity when the gate is open, else null. */
export function testLoginIdentity(env: TestLoginEnv): { userId: string; role: string } | null {
  if (testLoginProblem(env)) return null;
  const asked = (env['TEST_LOGIN'] ?? '').trim().toLowerCase();
  const role = ON.includes(asked) ? DEFAULT_TEST_ROLE : asked;
  return { userId: testUserId(role), role };
}

let told = false;
/** The gate as the app uses it: process.env, saying once per process that it is on, or why a TEST_LOGIN someone set stays off. */
export function currentTestLogin(): { userId: string; role: string } | null {
  const identity = testLoginIdentity(process.env);
  if (!told) {
    told = true;
    if (identity) console.warn(`TEST_LOGIN is on: everyone who reaches this server is signed in as ${identity.userId}. Local testing only.`);
    else if (process.env['TEST_LOGIN']?.trim()) console.warn(`TEST_LOGIN is set but stays off: ${testLoginProblem(process.env)}`);
  }
  return identity;
}
