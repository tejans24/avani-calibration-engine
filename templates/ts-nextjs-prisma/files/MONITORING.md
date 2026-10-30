# Monitoring and alerting

**The app emits; the platform alerts.** The app writes one line of JSON per
event to stdout (`src/lib/monitoring.ts`). Every host collects stdout and can
alert on it, so the app is monitored without a monitoring vendor. A vendor
(Sentry, Datadog…) is an adapter added in `src/lib/monitoring.ts` when you
need one, never calls spread through the code.

Signals never carry personal data or credentials: no request bodies, no
headers, no query strings (signed links keep tokens there). Routes are logged
by pattern.

## What is watched

| Signal | Where it comes from | Alert when |
|---|---|---|
| `request.error` | `src/instrumentation.ts`: every error Next.js catches on the server (pages, route handlers, server actions, middleware) | errors rise above normal (anomaly), or any at all on a route that must not fail |
| `health.database_down` | `/api/health` | it appears at all |
| Uptime | an outside monitor calling `GET /api/health` every 1–5 minutes: 200 = up, 503 = the database is unreachable | two failures in a row |
| `app.error` | anything the app catches and reports itself with `reportError` | as for `request.error` |

Not covered yet: errors in visitors' browsers (`src/app/error.tsx` shows a
friendly page but reports nothing), and scheduled jobs that silently stop
running. When you add a scheduled job, give it a heartbeat: it pings an
outside "dead man's switch" monitor each time it finishes, and that monitor
alerts when the ping does not arrive. Only an outside monitor can notice a job
that never ran.

## Wiring it up

Do this once per environment, before launch. Launch (`calibrate stage
promote`) assumes it is done.

### On Vercel

1. **Errors.** Project → Observability → Alerts: turn on the error anomaly
   alert. Send it to email and the team's Slack channel. Vercel's alerts are
   in beta and their plan availability has changed over time; check the
   current plan requirements. If your plan has no alerts, add a log drain to
   a service that alerts on `"event":"request.error"`.
2. **Uptime.** Point an uptime monitor at `https://<your-domain>/api/health`.
   Vercel has a guide for doing this with its own alerts; any outside uptime
   service also works, and has the advantage of noticing when Vercel itself
   is down.
3. **Product signals (optional).** Vercel Web Analytics and Speed Insights
   are first-party and need no cookies; add them when you want to see real
   traffic and real page speed.

### On AWS (Amplify, ECS, Lambda)

1. **Errors.** In CloudWatch Logs, a metric filter on
   `{ $.event = "request.error" }` → a metric → an alarm (anomaly detection or
   a threshold) → an SNS topic that emails the team or posts to Slack.
2. **Uptime.** A Route 53 health check (or CloudWatch Synthetics canary) on
   `/api/health`, with an alarm on failure.
3. Amplify Hosting sends its server logs to CloudWatch, so the same filter
   works there.

## Who is told, and what they do

Fill this in before launch. An alert nobody owns is noise.

| Alert | Goes to | First thing to do |
|---|---|---|
| Site down (`/api/health` failing) | | Open `/api/health`. `database: "down"`: check the database provider's status page and connection limits. No answer at all: check the host's status page and the last deploy; roll back if it started with a deploy. |
| Errors above normal | | Open the platform's logs, filter `"event":"request.error"`, group by `route`. One route: look at its last change. Every route: likely the database or a config/secret change. |
| Database down | | As "site down". |

After any real incident, write a few lines on what happened and what changes
so it does not repeat, and add a check for it if one would have caught it.
