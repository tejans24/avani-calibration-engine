import { auth } from '@clerk/nextjs/server';

/**
 * Auth adapter — third parties live behind adapters (avani-core discipline).
 * Actions and services depend on THIS interface, never on Clerk directly, so
 * swapping to a different provider (or a custom auth with its own management
 * dashboard) later means changing this file + middleware.ts, nothing else.
 *
 * Clerk activates when its keys are present (.env); until then auth is
 * disabled and a stable dev identity is returned, so a fresh clone runs — and
 * CI stays green — without any Clerk account.
 */
export const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export async function getCurrentUserId(): Promise<string | null> {
  if (!clerkConfigured) return 'dev-user';
  const { userId } = await auth();
  return userId;
}

/** Throwing variant for actions that must not run anonymously. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not signed in');
  return userId;
}
