import { auth } from '@clerk/nextjs/server';
import { currentTestLogin } from './test-login';

/**
 * Auth adapter — third parties live behind adapters (avani-core discipline).
 * Actions and services depend on THIS interface, never on Clerk directly, so
 * swapping to a different provider (or a custom auth with its own management
 * dashboard) later means changing this file + middleware.ts, nothing else.
 *
 * Who is signed in, in order:
 *  1. Test login (src/lib/test-login.ts): a made-up user, for e2e and for a
 *     human walking through the app. Local dev databases only; a fresh clone
 *     has it on (.env.example), so the app runs without any Clerk account.
 *  2. Clerk, once its keys are in .env.
 *  3. Nobody. Without Clerk keys or test login, everyone is signed out. This
 *     fails closed: a deploy that forgot its keys signs nobody in.
 */
export const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export async function getCurrentUserId(): Promise<string | null> {
  const test = currentTestLogin();
  if (test) return test.userId;
  if (!clerkConfigured) return null;
  const { userId } = await auth();
  return userId;
}

/** Throwing variant for actions that must not run anonymously. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new NotSignedInError();
  return userId;
}

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in');
  }
}
