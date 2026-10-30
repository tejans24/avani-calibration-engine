---
name: monitoring
description: Make a running app tell you when it breaks — the app emits structured signals, the hosting platform alerts on them, an outside monitor checks the app is up, every alert has an owner and a first step — without personal data in any signal and without tying the code to a vendor.
when_to_use: When adding an error path, a scheduled job, an external integration, or a new route that must not fail; before launch or a stage promotion; when choosing a host or monitoring service; when an alert fires or an incident is written up.
---

# Monitoring Discipline

Tests prove the app worked when it was built. Monitoring tells you it still works, for real people, today. An app with no alerts finds out it is broken from its users, if they bother to say.

## The app emits; the platform alerts

- **Signals are structured log lines**: one line of JSON per event, with a stable event name to alert on (`request.error`, `job.finished`, `health.database_down`). Every host collects stdout and can alert on a pattern, so the app needs no vendor to be monitored.
- **One module emits them.** A vendor SDK (an error tracker, an APM) is an adapter added there when the app outgrows logs, never calls spread through the code. Moving hosts must not mean rewriting how the app reports.
- **Catch what the framework swallows.** Wire the framework's own error hook, so an error rendered as a friendly error page still produces a signal. That is where errors silently go missing.

## What every deployed app has

1. **Server errors** as a signal, with an alert on errors above normal.
2. **A health endpoint** that checks what the app needs to work (at least the database), answers 200 or 503, and says nothing an outsider could use.
3. **An outside uptime monitor** on that endpoint. Outside, so it notices when the host itself is down.
4. **A heartbeat for every scheduled job**: it pings an outside "dead man's switch" monitor when it finishes, and that monitor alerts when the ping does not come. Only an outside check can notice a job that never ran.
5. **An owner for every alert** and a first step written next to it (MONITORING.md or equivalent). An alert nobody owns is noise and gets muted.

These are a launch gate: an app is not promoted to production until they are wired and the owner table is filled in.

## Never in a signal

Personal data or credentials: no request bodies, no headers (cookies, tokens), no query strings (signed links keep tokens there), no full names or emails. Log routes by pattern. If a signal needs to identify a record, use its id. Error messages from libraries can include hostnames; keep those in logs, never in a response.

## Alerts worth having

- Alert on symptoms people feel (down, erroring, a job not running), not on every cause (CPU at 80%).
- Prefer anomaly ("more than normal") for error volume and a hard threshold for "must never happen" events.
- Two failures before paging for uptime: one blip is the network.
- If an alert fires and nobody needs to act, fix it or delete it the same week.

## After an incident

Write a few lines: what people saw, why, what changes so it does not repeat. Add the check that would have caught it — a test, a signal, an alert — in the same change as the fix.
