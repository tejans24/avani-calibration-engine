import { prisma } from '@/lib/prisma';
import { reportError } from '@/lib/monitoring';

// Never cached: each request is a fresh look.
export const dynamic = 'force-dynamic';

/**
 * Health check for an uptime monitor (MONITORING.md): 200 when the app can
 * reach its database, 503 when it cannot. It says nothing an outsider could
 * use: no error text, no hostnames, just whether each part answers and which
 * build is running.
 */
export async function GET(): Promise<Response> {
  const started = Date.now();
  let database: 'ok' | 'down' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    database = 'down';
    reportError(err, { event: 'health.database_down' });
  }
  const ok = database === 'ok';
  return Response.json(
    { ok, database, build: process.env['VERCEL_GIT_COMMIT_SHA']?.slice(0, 7) ?? process.env['BUILD_ID'] ?? 'local', ms: Date.now() - started },
    { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
