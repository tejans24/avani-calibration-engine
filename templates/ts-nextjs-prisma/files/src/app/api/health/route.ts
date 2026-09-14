// Liveness for the platform health check (every deploy profile, engine SPEC
// §4.2): "the process is up and serving". Deliberately no database call — a
// database outage should page, not restart-loop the app.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json({ status: 'ok' });
}
