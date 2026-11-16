# CRMPro — Meta Platform Integrations

# Status and Scope

This document records the confirmed architecture direction for post-MVP Meta integrations as of
2026-09-10.

It covers:

- WhatsApp Business Platform;
- Messenger;
- Instagram Direct;
- Meta Ads attribution and outcome reporting;
- the WhatsApp-dependent Project Files ingestion boundary.

These are Phase 2 plans, not descriptions of implemented MVP behavior. Product scope and pricing
are defined in
[`../product/phase-2-roadmap.md`](../product/phase-2-roadmap.md).

Meta policies are external and time-sensitive. Revalidate windows, permissions, access levels,
onboarding limits, and token behavior before implementation and production rollout.

One Meta Developer App can host WhatsApp Business Platform, Messenger, and Instagram Graph API as
separate products. CRMPro should use that shared app boundary while keeping each channel's asset,
credential, webhook payload, and adapter distinct.

---

# Ownership and Trust Model

Tenant Meta assets remain tenant-owned.

| Channel | Tenant-owned asset | Delegated credential |
| --- | --- | --- |
| WhatsApp | WhatsApp Business Account and phone number | Token authorized for the tenant WABA/phone-number asset |
| Messenger | Facebook Page | Page Access Token |
| Instagram Direct | Instagram professional account linked to a Page | Instagram-scoped token |
| Ads | Tenant ad account | Production System User token with approved Marketing API access |

CRMPro must not create a commercial model in which it owns the tenant WABA or pays Meta message
charges on the tenant's behalf. Embedded Signup is the WhatsApp onboarding mechanism.

Delegated access tokens are secrets even though the assets remain tenant-owned. Store only the
tokens and identifiers required for API access, encrypt them at rest, never expose them to browser
clients or logs, restrict decryption to integration workers/services, and support revocation and
reconnection.

Every integration record, webhook-derived entity, message, template, campaign, and file must be
tenant-scoped.

---

# Channel-Neutral Messaging Domain

WhatsApp ships first, but core orchestration must not be implemented as WhatsApp-only business
logic.

```text
Meta webhook
  -> verify signature and resolve tenant integration
  -> normalize provider event
  -> deduplicate provider event/message
  -> resolve channel identity and Lead
  -> update conversation-window state
  -> persist inbound/outbound activity
  -> run channel-neutral lead/messaging rules
  -> publish internal events for UI invalidation and background work

Agent sends message
  -> authorize tenant user and Lead access
  -> read channel policy/window state
  -> allow free text OR require approved template
  -> channel adapter sends to Meta
  -> persist provider result in Lead timeline
```

The generic domain owns:

- normalized inbound/outbound messages;
- channel identity and Lead association;
- conversation-window state;
- approved-template enforcement;
- possible-match suggestions and merge decisions;
- timeline/audit integration;
- retry, idempotency, and provider-status handling.

Channel adapters own:

- Meta endpoint and payload details;
- asset-specific tokens and identifiers;
- webhook payload normalization;
- channel capabilities and policy values;
- template synchronization where supported.

This separation lets WhatsApp, Messenger, and Instagram reuse business rules without pretending
that their provider APIs are identical.

---

# Conversation Windows and Templates

The initial WhatsApp policy tracks:

- `whatsappWindowExpiresAt` for the 24-hour customer-service window opened by an inbound message;
- `whatsappFepExpiresAt` for the 72-hour free-entry-point window opened through a
  Click-to-WhatsApp ad.

Free text is allowed only while an applicable window is open. After it closes, sending requires a
Meta-approved template. Template state includes name, category, locale/content as needed, and Meta
approval status. Supported categories are Marketing, Utility, and Authentication.

Messenger and Instagram must call the same policy service and follow the confirmed
24-hour-window-then-template rule. Do not implement window checks only in frontend controls or
separately in each controller. The backend is authoritative, and policy values must remain
configurable for future provider-rule changes.

The WhatsApp fields above are required domain state, but the final schema should not grow another
pair of Lead columns for every channel. During schema design, choose either:

- initial WhatsApp Lead fields behind a generic interface with a planned normalization migration;
  or
- a tenant-scoped channel/conversation-state record from the start.

Whichever physical model is chosen must preserve channel-specific expiry timestamps and allow
multiple scoped identities without weakening tenant isolation.

---

# Conceptual Data Model

Minimum WhatsApp concepts:

```text
WhatsAppIntegration
  tenantId
  wabaId
  phoneNumberId
  status
  delegatedCredentialReference

Template
  tenantId
  integrationId
  name
  category
  metaApprovalStatus

Lead
  whatsappWindowExpiresAt
  whatsappFepExpiresAt
  ctwaClid

Campaign
  tenantId
  providerCampaignId
  attribution metadata

ProjectFile
  tenantId
  projectId
  uploader/sender
  status
  label and metadata
  fileHash
  stored object reference
```

This is a conceptual model, not an approved Prisma migration. A detailed schema design still needs
to resolve generic channel identities, message/provider IDs, conversation state, token storage,
template localization/versioning, campaign relationships, and Project File supersession.

Inbound and outbound messages must be represented in the existing Notes / Activity Timeline.
Provider-specific metadata can accompany the activity, but the user-facing lead history remains a
single chronological stream.

---

# Lead Resolution and Cross-Channel Identity

Meta scoped IDs are channel- and asset-specific. Do not assume that WhatsApp, Messenger, and
Instagram identifiers refer to the same person.

Resolution policy:

1. Auto-merge only on an exact normalized phone-number match.
2. Name and overlapping project interest may create a possible-match suggestion.
3. A user must confirm a possible match before records merge.
4. Users can manually merge and unmerge.
5. Audit Logs record actor, source identities, target Lead, reason/evidence, and merge/unmerge
   outcome.

Weak-evidence suggestions must never silently change Lead ownership, assignment, pipeline state,
or activity history.

---

# Webhook Ingestion

Webhook handling should acknowledge valid provider deliveries quickly and move durable processing
to background jobs.

Required boundaries:

- verify the Meta webhook challenge and request signature;
- resolve the integration and tenant from trusted stored identifiers, never a client-supplied
  tenant ID;
- persist or enqueue before acknowledgement where required for loss resistance;
- deduplicate on stable provider event/message IDs;
- make retries idempotent;
- record provider delivery/failure status without logging tokens or sensitive payloads wholesale;
- quarantine unresolved integrations/events for operator review rather than assigning them to a
  guessed tenant.

Inbound flow:

1. Normalize the event.
2. Resolve or create the channel identity and Lead.
3. Update the applicable messaging window.
4. Persist the message into the Lead timeline.
5. Emit internal events for notifications and realtime invalidation.

Outbound flow:

1. Authorize the tenant actor and Lead.
2. Resolve the integration and recipient channel identity.
3. Enforce free-text/template policy in the backend.
4. Send through the channel adapter.
5. Persist the provider message ID and outcome in the timeline.

---

# Project Files Media Intake

Project Files depends on reliable WhatsApp media ingestion.

When the webhook references a forwarded file, download it immediately into CRMPro-controlled
object storage. Meta's media URL is only a retrieval source and must not become the stored file
reference.

After storage:

- calculate a content hash;
- deduplicate within the tenant;
- create or link a `pending` Project File;
- start the approximately six-hour metadata-completion window;
- schedule a reminder to the forwarder;
- retain expired pending files and place them in a manager/admin review queue;
- approve and associate the file with a Project only after metadata completion;
- preserve superseded versions.

Never delete a pending file merely because its metadata deadline expired. Object lifecycle rules
must distinguish deliberate retention policy from workflow status.

---

# Ads Attribution and Conversion Feedback

On the first inbound message from a supported Click-to-Meta ad entry point, capture `ctwa_clid`
from the referral object and store it with the Lead. This baseline attribution does not depend on
Marketing API spend access.

Deeper reporting requires:

- a tenant-scoped `Campaign` entity;
- `ads_read` and `business_management` under the applicable Meta access model;
- approved access to tenant ad accounts in production;
- scheduled synchronization using System User tokens, not personal user tokens that are expected
  to expire after roughly 60 days;
- explicit handling of revoked permissions and partial sync failures.

When a Lead reaches an agreed outcome such as Closed Won, enqueue a conversion event for
Conversions API for Business Messaging and associate it with `ctwa_clid`. The reporting job must
be idempotent and auditable so retries do not create ambiguous outcome reporting.

Ads attribution is downstream of messaging and must not block the initial messaging launch.

---

# Environments and Release Gates

Development can use a personal Meta developer account, test WABA numbers, and the Marketing API
Sandbox Ad Account. Company registration is not required to build the integration against those
test assets.

Production onboarding requires separate readiness for CRMPro and each tenant:

## CRMPro Readiness

- legal company registration;
- Meta Business Verification;
- required App Review and Full Access permissions;
- production System User/token strategy;
- encrypted secret storage and rotation/revocation operations;
- webhook reliability, monitoring, replay, and incident procedures.

## Tenant Readiness

- tenant legal registration where Meta requires it;
- tenant Business Verification;
- tenant ownership of WABA, Page, Instagram professional account, and ad account as applicable;
- completed Embedded Signup/connection and working delegated access.

The recorded planning limits are 10 new tenant onboardings per week for an unverified Tech
Provider and 200 per week after CRMPro Business Verification. Treat these as launch-planning
assumptions and verify them before relying on them operationally.

---

# Architecture Decisions

- Build messaging as a generic channel domain with provider adapters; ship WhatsApp first.
- Keep tenant Meta assets and Meta billing tenant-owned.
- Enforce windows and approved-template rules in backend services.
- Write all channel messages into the existing Lead timeline.
- Auto-merge identities only on exact phone matches; make weaker matching human-confirmed.
- Audit merge and unmerge operations.
- Capture basic ad-click attribution from inbound referrals before adding Marketing API reporting.
- Use System User tokens for production ads automation.
- Persist WhatsApp media immediately before requesting Project File metadata.
- Store raw Project Files; do not introduce AI spreadsheet normalization in this phase.
