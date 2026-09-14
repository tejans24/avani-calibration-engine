# Deploy target — decision brief

> The engine proposes; the owner decides. This brief lists every option and what it would cost you, so the decision is made with the menu in view, not just the pick. Rules: SPEC §4.1; profiles: SPEC §4.2.

## Status

**Proposed: `vercel` — not yet decided.** Nothing deploys on a proposal.

To decide, re-run calibration with the owner's choice and reason:

```bash
calibrate generate <intake.json> --infra vercel --why "<reason>"   # accept
calibrate generate <intake.json> --infra <other>  --why "<reason>"   # override
```

## The engine's proposal

`vercel` — rule 4: request/response Next.js app with low ops capacity — lowest-ops target; app on Vercel with managed Postgres is the sanctioned split.

Runner-up: `railway`.

## Options

### `vercel` — RECOMMENDED

- **What it is:** Serverless Next.js hosting (functions + edge proxy) with a managed Postgres that branches per preview.
- **For this project:** Request/response Next.js app with low ops capacity and no long-lived process recorded — the lowest-ops target (rule 4).
- **Trade-offs:** No long-lived process: websockets, background workers and in-process cron need another service. Two vendors for one app (host + database). Pricing has cliffs at roughly 10x scale.
- **Cost shape:** Near-zero at small scale; usage-based with cliffs as traffic and function time grow.
- **Ops burden:** lowest

### `railway` — viable · backed by a shipped project

- **What it is:** One long-lived container per service built from the repo, with a platform Postgres on a persistent volume; config as code; migrations run atomically before each release.
- **For this project:** Same low ops as the recommendation, with a long-lived process and flat pricing; costs a little more at zero traffic and gives up native per-PR previews.
- **Trade-offs:** Single region; fewer compliance controls than a hyperscaler; per-PR previews are opt-in rather than native; the ecosystem is smaller when you need an unusual add-on.
- **Cost shape:** Flat and predictable: a small fixed monthly amount that grows with allocated resources, not with requests.
- **Ops burden:** low
- **Becomes the answer if:** the app needs websockets/realtime, background workers or cron (rule 3), or the budget needs a flat predictable bill.

### `aws` — viable

- **What it is:** ECS Fargate service behind a load balancer with RDS Postgres in a private subnet, everything defined in CDK (Lambda only for an API-only Python service).
- **For this project:** No existing-cloud, compliance, residency, private-networking or 100x signal is recorded, and it costs a human sooner with low ops capacity — so not proposed on what is known.
- **Trade-offs:** Costs a human sooner: someone owns IAM, networking and the CDK stack. First deploy is days, not minutes. Cost depends on the architecture you build, so it needs watching.
- **Cost shape:** Architecture-dependent: a baseline for the load balancer, NAT and RDS even at zero traffic, then scales with what you provision.
- **Ops burden:** high
- **Becomes the answer if:** the client already runs AWS (rule 1), or a compliance regime, data residency, private networking or a 100x horizon applies (rule 2). Always with CDK.

### `gcp` — viable

- **What it is:** Cloud Run service with Cloud SQL Postgres over private IP, defined in Terraform.
- **For this project:** Same ops weight as AWS with less house depth; nothing recorded pulls toward GCP.
- **Trade-offs:** Same ops weight as AWS, and the house has less depth here — AWS is the default hyperscaler, so GCP is a client-pulled choice. Worth it when the workload is GCP-native (BigQuery, Vertex, Document AI).
- **Cost shape:** Architecture-dependent; Cloud Run scales to zero, Cloud SQL does not.
- **Ops burden:** high
- **Becomes the answer if:** the client already runs GCP (rule 1) or the workload is GCP-native — BigQuery, Vertex, Document AI (rule 2).

### `self-hosted` — not recommended

- **What it is:** Docker Compose on a VM the client runs (Kubernetes only if the client already operates it); Postgres on the host with its own volume.
- **For this project:** Ops capacity is low; self-hosting needs high — someone must own patching, backups and uptime.
- **Trade-offs:** You are the platform: patching, uptime, backups, restore drills and on-call are yours. No managed previews or staging unless funded. Only ever a requirement, never a cost play.
- **Cost shape:** Hardware or VM rental plus the human time to run it — the second term dominates.
- **Ops burden:** highest
- **Becomes the answer if:** data may not leave client premises (rule 5) AND the client funds the ops capacity to run it.

## Not yet considered

The intake profile does not carry these inputs yet, so the rules that need them could not fire. If any applies to this project, it changes the answer — weigh them before accepting.

- existing_cloud (rule 1: a client cloud with procurement and IAM in place)
- compliance_regime / data_residency / private_networking (rule 2)
- scale_horizon (rule 2 at 100x; tie-breaker at 10x)
- needs_realtime / needs_background_jobs (rule 3: long-lived process)
- on_premises_required (rule 5)
