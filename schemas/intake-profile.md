# intake-profile

**Schema version:** 1.0.0

Structured, pre-calibration facts about an application, produced by the Intake layer.

| Field | Type | Required | Values | Description |
|---|---|---|---|---|
| `schemaVersion` | string | yes |  | Schema version this document conforms to (semver). |
| `type` | string | yes |  | Profile archetype, e.g. field-data-collection, saas, enterprise-tool. |
| `client_count` | integer | yes |  | Number of distinct client organizations served. |
| `user_count` | integer | yes |  | Expected total user count. |
| `peak_concurrent` | integer | yes |  | Expected peak concurrent users. |
| `annual_records` | integer | yes |  | Expected records created per year (sizing signal). |
| `roles` | string[] | yes |  | Distinct user roles, e.g. volunteer, coordinator, admin. |
| `offline_required` | boolean | yes |  | Whether the app must function offline (drives offline plugins). |
| `has_pii` | boolean | yes |  | Whether the app stores personally identifiable information. |
| `has_protected_geo` | boolean | yes |  | Whether the app stores location data that must be protected (e.g. endangered species sites). |
| `has_money_transactions` | boolean | yes |  | Whether the app handles payments or money movement. |
| `data_provenance_critical` | boolean | yes |  | Whether an auditable, append-only record of data provenance is required. |
| `timeline_weeks` | integer | yes |  | Target delivery timeline in weeks. |
| `budget_usd` | number | yes |  | Project budget in USD. |
| `ops_capacity` | enum | yes | `low` · `medium` · `high` | How much operational capacity the owner has to run the system. |

> Generated from the Zod source by `npm run schema:build`. Do not edit by hand.
