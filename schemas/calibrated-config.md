# calibrated-config

**Schema version:** 1.0.0

The calibrated configuration produced from an intake profile: dials, invariants, patterns, and risk.

| Field | Type | Required | Values | Description |
|---|---|---|---|---|
| `schemaVersion` | string | yes |  | Schema version this document conforms to (semver). |
| `profile` | string | yes |  | Profile name the calibration was run under, e.g. field-app. |
| `dials` | object | yes |  | The resolved calibration dials for the app. |
| `invariants` | string[] | yes |  | Named invariants to enforce (exact-match keys, e.g. observations_append_only_never_delete). |
| `patterns` | string[] | yes |  | Named stack patterns to inject, e.g. nextjs-app-router. |
| `risk_assessment` | object | yes |  | Feasibility, cost, and timeline assessment for the calibrated app. |

### dials

The resolved calibration dials for the app.

| Field | Type | Required | Values | Description |
|---|---|---|---|---|
| `correctness_bar` | enum | yes | `basic` · `standard` · `strict` · `append-only` | How rigorous correctness guarantees must be. Rises with money transactions or critical data provenance. |
| `sensitivity` | enum | yes | `low` · `medium` · `high` · `protected` | How careful to be with the data. Intrinsic to the domain; scales hook severity at generation time. |
| `infra` | enum | yes | `vercel` · `railway` · `aws` · `gcp` · `self-hosted` | Deployment target for the app, chosen by the decision rules in SPEC §4.1 and realized by the matching deploy profile (SPEC §4.2). vercel: request/response Next.js apps, lowest ops. railway: apps that need a long-lived process (workers, websockets, cron) or flat predictable cost. aws / gcp: an existing client cloud, a compliance or residency regime, private networking, or a large scale horizon — always with infrastructure as code. self-hosted: data that may not leave client premises; needs high ops capacity. |
| `runtime` | enum | yes | `ts-nextjs` · `python` | Per-app runtime. ts-nextjs is the default for product/UI apps; python for small backend APIs, ML workflows, and data pipelines. |
| `topology` | enum | yes | `single-app` · `monorepo` | Repo shape. monorepo when the project spans multiple apps (one monorepo per client project). |

### risk_assessment

Feasibility, cost, and timeline assessment for the calibrated app.

| Field | Type | Required | Values | Description |
|---|---|---|---|---|
| `feasibility` | enum | yes | `low` · `medium` · `high` | Overall feasibility rating. |
| `estimated_budget_usd` | number | yes |  | Estimated token/build budget in USD. |
| `estimated_infra_monthly_usd` | number | yes |  | Estimated monthly infrastructure cost in USD. |
| `timeline_risk` | enum | yes | `low` · `medium` · `high` | Risk that the timeline slips. |
| `mitigations` | string[] | yes |  | Recommended risk mitigations, e.g. start_with_mvp. |

> Generated from the Zod source by `npm run schema:build`. Do not edit by hand.
