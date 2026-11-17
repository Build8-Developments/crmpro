# Inbound Leads API

Send leads from websites, landing pages, Zapier/Make, or ad platforms (Meta / TikTok / Snapchat lead forms via Zapier or Make) straight into CRMPro.

## Authentication

1. Settings → **Integrations** → **New API key** (needs `api-key.manage`, Owner by default, and a plan with **API access**).
2. Copy the key — it is shown once. Only a SHA-256 hash is stored.
3. Send it as `X-Api-Key: crm_live_…` (or `Authorization: Bearer crm_live_…`).

Revoked keys stop working immediately. Suspended workspaces are refused (403).

## Endpoint

```
POST /api/v1/inbound/leads
Content-Type: application/json
X-Api-Key: crm_live_…
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `fullName` | string | ✅ | 2–120 chars |
| `phone` | string | ✅ | local (`010…`) or international (`+20…`) |
| `secondaryPhone` | string | | |
| `email` | string | | |
| `source` | string | | lead source name; created if missing (e.g. `Facebook Ads`) |
| `project` | string | | matched to an existing project by name (case-insensitive) |
| `budgetMin`, `budgetMax` | number | | |
| `note` | string | | ≤ 2000 chars, kept on the lead and the timeline |
| `campaign` | string | | ad / campaign name, kept on the timeline |
| `externalId` | string | | your id; repeats are answered idempotently |
| `metadata` | object | | utm_*, form answers… stored on the timeline |

### Example

```bash
curl -X POST "https://app.example.com/api/v1/inbound/leads" \
  -H "X-Api-Key: crm_live_…" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ahmed Ali","phone":"01001234567","source":"Facebook Ads",
       "project":"Palm Hills New Cairo","campaign":"November launch","externalId":"fb-123"}'
```

### Response

```json
{ "success": true, "data": { "leadId": "…", "duplicate": false } }
```

## Ownership rule (no duplicates)

- Same `externalId` again → the same `leadId`, `duplicate: true`, nothing changes.
- Phone (primary or secondary) already on an **open** lead → **no new lead**. The existing lead gets a "came back via integration" timeline entry (source, campaign, note) and its owner is notified. Response: `duplicate: true`.
- Otherwise a new lead is created in the default pipeline's first stage. If **auto-assign** is on (Settings → Lead distribution) it is routed round-robin, and the speed-to-lead SLA clock starts.

## Errors

| Status | Meaning |
|---|---|
| 400 | validation error (`error.details` lists fields) |
| 401 | missing / invalid / revoked key |
| 403 | workspace suspended, plan without API access, or lead quota reached |
| 429 | more than 120 requests per minute |

## Zapier / Make recipe (Meta Lead Ads)

1. Trigger: *Facebook Lead Ads → New Lead*.
2. Action: *Webhooks → POST* to the endpoint above, header `X-Api-Key`.
3. Map `full_name → fullName`, `phone_number → phone`, form name → `campaign`, lead id → `externalId`, and set `source` to `Facebook Ads`.
