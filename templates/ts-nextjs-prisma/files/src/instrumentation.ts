import type { Instrumentation } from 'next';
import { reportError, safePath } from '@/lib/monitoring';

/**
 * Every error Next.js catches on the server (pages, route handlers, server
 * actions, middleware) becomes one `request.error` signal (src/lib/monitoring.ts).
 * Without this, an error in a server component is rendered as the error page
 * and never reaches any log you would alert on. Headers are never logged.
 */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  reportError(err, {
    event: 'request.error',
    method: request.method,
    path: safePath(request.path),
    route: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });
};
