# Inbound leads API

Push leads into CRMPro from website forms, Zapier, Make, or ad platforms such as Meta Lead Ads.

- **Endpoint:** `POST https://<your-crm-host>/api/v1/inbound/leads`
- **Auth:** an API key from **Settings → Integrations** (needs `settings.manage` and a plan with API access)
- **Body:** JSON, `Content-Type: application/json`

New leads land **unassigned** in the workspace's default pipeline, in its first stage. CRMPro does not assign them automatically. The workflow rules create the usual "assign new leads" task, and managers distribute the leads from there.

---

## 1. API keys

| | |
|---|---|
| Format | `crm_live_` followed by 43 random characters |
| Storage | CRMPro keeps only a SHA-256 hash and the first characters (for example `crm_live_Ab3x…`) so you can tell keys apart. The full key is shown **once**, when you create it. |
| Limit | 20 active keys per workspace |
| Revoking | Takes effect immediately. A revoked key can't be restored, so create a new one instead. |
| Lead source | You can pin a lead source to a key. Every lead sent with that key gets that source, whatever the request says. |

Use one key per integration (website, Zapier, Make, …), so you can revoke one without breaking the others.

**Keep keys server-side.** Don't put a key in browser JavaScript on your website, because anyone could read it there. Send the request from your form backend, a serverless function, or a no-code tool. Browser requests are also blocked by CORS.

Management endpoints (JWT, permission `settings.manage`, plan feature `apiAccess`):

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/api-keys` | List keys: name, prefix, source, last used, created by and at, revoked at |
| `POST` | `/api/v1/api-keys` | `{ "name": "Zapier – Meta", "sourceId": "<uuid>"? }`. The response includes `apiKey` this one time. |
| `DELETE` | `/api/v1/api-keys/:id` | Revoke the key. Revoking an already revoked key changes nothing. |

---

## 2. Authentication

Send the key in either header:

```http
Authorization: Bearer crm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```http
X-Api-Key: crm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

| Status | When |
|---|---|
| `401` | The key is missing, unknown, or revoked |
| `403` | The workspace is suspended or its subscription has ended, or the plan doesn't include API access |
| `429` | Rate limited (see §6). Wait for the number of seconds in `Retry-After`. |

---

## 3. Request body

Only `fullName` and `phone` are required. CRMPro drops fields it doesn't know and treats empty strings as "not sent", which suits no-code tools that send `""` for unmapped fields.

| Field | Type | Notes |
|---|---|---|
| `fullName` | string, 2–120 | **Required** |
| `phone` | string or number, 5–32 | **Required**. Any common Egyptian or international format; CRMPro normalizes it for duplicate detection. |
| `secondaryPhone` | string, ≤ 32 | Must differ from `phone` |
| `email` | email, ≤ 254 | |
| `message` | string, ≤ 2000 | The form's free text. It appears on the lead's timeline. |
| `projectIds` | UUID[] (≤ 10) or a comma-separated string | CRMPro project ids. An unknown id rejects the lead with `422`. |
| `projectName` | string, ≤ 160 | Used when `projectIds` is absent. Matched case-insensitively. An unknown name is ignored and kept on the timeline. |
| `source` | string, ≤ 80 | Lead source **name**, matched case-insensitively. Ignored if the key has a pinned source. An unknown name is ignored (kept on the timeline) and does not create a source. |
| `externalId` | string, ≤ 200 | Your id for this lead, for example the Meta lead id. Makes retries safe (see §5). |
| `budgetMin`, `budgetMax` | number ≥ 0 | `"1,500,000"` is accepted. If min is above max, both are dropped. |
| `occupation`, `residenceArea` | string, ≤ 120 | |
| `paymentPreference` | `CASH` · `INSTALLMENTS` · `MORTGAGE` · `FLEXIBLE` | Case-insensitive. Unknown values are ignored. |
| `contactChannelPreference` | `CALL` · `WHATSAPP` · `EMAIL` · `SMS` | Same rules as `paymentPreference` |
| `contactTimePreference` | `MORNING` · `AFTERNOON` · `EVENING` · `ANYTIME` | Same rules |
| `purchasePurpose` | `LIVING` · `INVESTMENT` · `VACATION_HOME` | Same rules (`"vacation home"` works) |
| `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent` | string, ≤ 200 | Stored on the timeline entry |

Example:

```bash
curl -X POST "https://crm.example.com/api/v1/inbound/leads" \
  -H "Authorization: Bearer crm_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Ahmed Ali",
    "phone": "01001234567",
    "email": "ahmed@example.com",
    "message": "Interested in a 3-bedroom apartment",
    "projectName": "Palm Hills New Cairo",
    "budgetMin": 4000000,
    "paymentPreference": "installments",
    "externalId": "meta-lead-123456",
    "utmSource": "facebook",
    "utmCampaign": "november-launch"
  }'
```

---

## 4. Responses

Successful responses use CRMPro's usual envelope and return **only the lead id**. They never include another lead's data.

```json
{ "success": true, "data": { "leadId": "7d0f…", "status": "created" } }
```

| HTTP | `status` | Meaning |
|---|---|---|
| `201` | `created` | A new lead was created, unassigned. |
| `200` | `duplicate_request` | This `externalId` was already processed. Nothing changed, so a retry is safe. |
| `200` | `resubmitted` | The phone belongs to an **open** lead. No new lead was created; see below. `leadId` is the existing lead. |
| `400` | – | Validation failed. `error.details` lists the fields. |
| `401` / `403` / `429` | – | See §2 and §6 |
| `422` | – | The lead couldn't be created. `error.message` gives the reason: `Unknown project`, `Lead quota exceeded`, `Name must be at least 2 characters`, `Secondary phone must not match primary phone`, or no default pipeline configured. |

Errors look like this:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Lead quota exceeded" } }
```

### Duplicate phones

- **Open lead with the same phone** (primary or secondary). The client came back. CRMPro adds a **"Lead resubmitted"** entry to that lead's timeline, with the key name, message, and UTM values. It then notifies the lead's owner, or, if the lead is unassigned, the managers who distribute leads. These notifications go out at most once per lead per hour. The response is `200 resubmitted`.
- **Only closed (won/lost) leads with that phone.** A returning client is a new opportunity, so CRMPro creates a new lead (`201 created`). The new lead's timeline links to the previous lead.

---

## 5. Idempotency and retries

Always send `externalId` when the source has one; for Meta Lead Ads, use the lead id. With it:

- Re-sending the same lead returns `200 duplicate_request` with the same `leadId`. No second lead, timeline entry, or notification is created.
- This also covers resubmissions: a retried resubmission doesn't add a second timeline entry.
- `externalId` is unique per workspace among live leads.

Without `externalId`, CRMPro still never creates a second open lead for the same phone. A retry becomes a `resubmitted` entry instead. If the same key sends the same message for that lead again within an hour, the response is still `200 resubmitted`, but no second timeline entry is added.

Retry on `429` (after `Retry-After`) and on `5xx`. Don't retry `400`, `401`, `403`, or `422` without changing something first.

---

## 6. Rate limits

| Limit | Value | Response |
|---|---|---|
| Per key | 60 requests per minute | `429` with `Retry-After`. `X-RateLimit-Limit` and `X-RateLimit-Remaining` are sent on every authenticated request. |
| Bad keys per IP | 30 failed key checks per 15 minutes | After that, **every** request from that IP gets `429` until the window ends. This slows down key guessing. |

If you need to backfill thousands of leads, use **Imports** (CSV) instead.

---

## 7. Recipe: Meta (Facebook/Instagram) Lead Ads → CRMPro with Zapier or Make

1. **In CRMPro:** go to Settings → Integrations → **New API key**. Name it "Zapier – Meta Lead Ads" and, optionally, pin the source "Facebook Ads". Copy the key.
2. **Trigger:**
   - *Zapier:* **Facebook Lead Ads → New Lead**. Pick the page and the form.
   - *Make:* **Facebook Lead Ads → Watch Leads**.
3. **Action:**
   - *Zapier:* **Webhooks by Zapier → Custom Request** (or **POST**). Method `POST`, URL `https://<your-crm-host>/api/v1/inbound/leads`, Data pass-through off.
   - *Make:* **HTTP → Make a request**. Method `POST`, body type `Raw`, content type `JSON (application/json)`.
4. **Headers:** `Authorization: Bearer crm_live_…` and `Content-Type: application/json`.
5. **Body:** map the form fields:

   ```json
   {
     "fullName": "{{Full Name}}",
     "phone": "{{Phone Number}}",
     "email": "{{Email}}",
     "message": "{{What are you looking for?}}",
     "projectName": "{{Form Name or Project question}}",
     "externalId": "{{Lead ID}}",
     "utmSource": "facebook",
     "utmCampaign": "{{Campaign Name}}",
     "utmContent": "{{Ad Name}}"
   }
   ```

   Map **Lead ID** to `externalId`. Zapier and Make retry failed steps, and this keeps those retries from creating duplicates.
6. **Test:** send a test lead from Meta's Lead Ads Testing Tool. You should get `201` and see the lead in CRMPro, unassigned, in the first stage. Send it again and you should get `200 duplicate_request`.
7. **Errors:** in Zapier, turn on autoreplay for `429`/`5xx`. In Make, add a **Break** error handler on the HTTP module. A `422` response says why the lead was rejected; for example, the lead quota was reached.

Website forms work the same way. Have the form's backend (or a serverless function) `POST` the fields above with the key in the header. Pass the page's `utm_*` query parameters as `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, and `utmContent`.
