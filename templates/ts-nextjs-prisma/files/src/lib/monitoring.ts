/**
 * Monitoring signals: the app EMITS, the platform ALERTS (MONITORING.md).
 *
 * Every event is one line of JSON on stdout. Vercel Observability, CloudWatch
 * Logs, Fly, Render and plain Docker all collect stdout, and each can alert on
 * a pattern in it, so the app needs no monitoring vendor to be monitored. A
 * vendor (Sentry, Datadog…) is an adapter added here later, never a call
 * sprinkled through the code.
 *
 * Signals never carry personal data or credentials: no request bodies, no
 * headers (cookies, tokens), no query strings (signed links put tokens there).
 * Routes are logged by pattern (`/notes/[id]`), not by the address someone
 * typed.
 */
export type Level = 'info' | 'warn' | 'error';

export type MonitoringEvent = {
  level: Level;
  /** A stable name to alert on, e.g. `request.error`, `job.finished`. */
  event: string;
  [field: string]: unknown;
};

/** A path without its query string or fragment. */
export function safePath(path: string): string {
  return path.split(/[?#]/)[0] ?? '';
}

/** An error as fields worth logging: name, message and the first few stack frames. */
export function errorFields(err: unknown): { errorName: string; message: string; stack?: string; digest?: string } {
  if (err instanceof Error) {
    const digest = (err as Error & { digest?: unknown }).digest;
    return {
      errorName: err.name,
      message: err.message.slice(0, 500),
      stack: err.stack?.split('\n').slice(0, 6).join('\n'),
      ...(typeof digest === 'string' ? { digest } : {}),
    };
  }
  return { errorName: 'NonError', message: String(err).slice(0, 500) };
}

/** The line written for an event. Pure, so it is unit-tested. */
export function formatEvent(e: MonitoringEvent, now: Date = new Date()): string {
  return JSON.stringify({ time: now.toISOString(), app: '{{APP_NAME}}', ...e });
}

export function emit(e: MonitoringEvent): void {
  const line = formatEvent(e);
  if (e.level === 'error') console.error(line);
  else if (e.level === 'warn') console.warn(line);
  else console.log(line);
}

/** Report an error the app caught (or Next.js caught for it) as a `<event>` error signal. */
export function reportError(err: unknown, context: Record<string, unknown> & { event?: string } = {}): void {
  const { event = 'app.error', ...rest } = context;
  emit({ level: 'error', event, ...rest, ...errorFields(err) });
}
