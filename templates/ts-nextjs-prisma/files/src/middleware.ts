import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { testLoginIdentity } from '@/lib/test-login';

// Clerk middleware runs only when Clerk is configured (keys in .env) and test
// login is off; otherwise every route passes through, so the skeleton runs
// without an account and tests reach signed-in screens (src/lib/test-login.ts).
// To protect routes, switch to clerkMiddleware((auth, req) => ...) with a
// route matcher — see the Clerk docs.
const passThrough = () => NextResponse.next();

export default process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !testLoginIdentity(process.env) ? clerkMiddleware() : passThrough;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
