# CRMPro — Phase 2 Product Roadmap

## Purpose

This document records confirmed post-MVP product decisions made on 2026-09-10.

Phase 2 extends CRMPro after the core CRM MVP. It does not change the MVP scope or authorize
these features to be added to MVP work.

Detailed integration design lives in
[`../architecture/meta-platform-integrations.md`](../architecture/meta-platform-integrations.md).
Competitive context lives in
[`competitive-positioning.md`](competitive-positioning.md).

---

# Roadmap Sequence

The planned sequence is:

1. Build a channel-neutral messaging foundation and launch WhatsApp first.
2. Add Messenger and Instagram Direct using the same messaging domain.
3. Add Project Files intake once inbound WhatsApp media capture is reliable.
4. Build Meta Ads attribution and outcome reporting as a separate phase after messaging.

This sequence is directional. It does not set delivery dates.

---

# 1. Meta Messaging

## Product Goal

Bring agency conversations into the lead workflow without making CRMPro the owner or reseller of
the agency's Meta assets.

WhatsApp is the first channel. Messenger and Instagram Direct follow on the same underlying
messaging abstraction.

## Ownership Model

Each tenant owns and verifies its own WhatsApp Business Account directly with Meta.

CRMPro:

- onboards the tenant through Meta Embedded Signup;
- connects to tenant-owned assets using delegated credentials;
- provides the inbox, lead workflow, window enforcement, templates, activity history, and support;
- does not own the tenant's WABA;
- does not pay or resell the tenant's Meta message charges;
- does not place itself in Meta's billing loop.

The same asset-ownership principle applies to Facebook Pages, Instagram professional accounts,
and tenant ad accounts.

## Messaging Rules

For WhatsApp:

- an inbound customer message opens a 24-hour customer-service window;
- a Click-to-WhatsApp ad can open a 72-hour free-entry-point window;
- free-text replies are allowed only while an applicable window is open;
- after the window closes, outbound messaging must use a Meta-approved template;
- templates retain their Meta category and approval status: Marketing, Utility, or Authentication.

Messenger and Instagram Direct must use the same window-policy domain rather than separate
channel-specific business logic. The confirmed product rule is the same 24-hour-window-then-
template behavior for those channels. Keep policy values configurable so future Meta policy
changes do not require a domain rewrite.

## Lead and Timeline Behavior

Inbound messages may create a new lead or update an existing lead. Inbound and outbound messages
must appear in the lead's existing Notes / Activity Timeline so agents have one chronological
record of contact.

The WhatsApp release requires:

- a tenant-scoped `WhatsAppIntegration` record;
- tracked customer-service and free-entry-point expiry state;
- a tenant-scoped template catalogue with category and Meta approval state;
- durable inbound and outbound message activity records.

The physical schema must preserve these concepts while avoiding a new pair of Lead columns for
every future channel. The architecture document defines that constraint without prematurely
locking the final migration shape.

---

# 2. Commercial Model for the Messaging Addon

The messaging addon is priced as a flat agency fee.

It is not priced as a percentage markup on Meta message charges because Meta bills the tenant
directly. CRMPro is selling workflow software and support, not reselling message delivery.

## Pricing Rules

- Tier by CRMPro plan or seat band, not by message volume.
- Do not use message caps as the paid tier boundary. A tenant owns its WABA and can communicate
  outside CRMPro, so total WABA volume is not a reliable entitlement meter.
- Charge a one-time setup fee when CRMPro assists with Meta onboarding and verification.
- The recurring fee funds Embedded Signup UX, webhook ingestion, messaging-window tracking,
  template management, infrastructure, and support.
- Meta's usage charges remain separate and are paid by the tenant to Meta.

Final price points and seat bands remain a commercial decision.

---

# 3. Meta Readiness and Registration

Development and test work can begin before CRMPro is company-registered or business-verified.

The team can build and test WhatsApp, Messenger, Instagram, and Ads integrations with:

- a personal Meta developer account;
- test WABA numbers and test assets;
- the free Marketing API Sandbox Ad Account.

Before real tenant onboarding at scale, CRMPro must complete its own legal registration and Meta
Business Verification. The planning assumption recorded on 2026-09-10 is that an unverified Tech
Provider is limited to 10 new tenant onboardings per week, increasing to 200 per week after
Business Verification.

Each tenant is independently responsible for its own legal registration and Meta Business
Verification. CRMPro verification does not replace tenant verification.

Meta policies, permissions, limits, and product names can change. Revalidate them against current
Meta documentation before implementation milestones and production launch.

---

# 4. Multi-Channel Identity

Meta does not provide one automatic person identity across WhatsApp, Messenger, and Instagram.
The same person can have a different scoped identifier on every channel.

CRMPro will use confidence-tiered matching:

1. Automatically merge only when an exact normalized phone number matches.
2. For weaker evidence, such as name plus overlapping project interest, show a possible-match
   suggestion for an agent to confirm.
3. Never auto-merge from weak evidence.
4. Always support manual merge and unmerge.
5. Record every merge and unmerge in Audit Logs.

This policy favors reversible, auditable decisions over aggressive deduplication.

---

# 5. Meta Ads Attribution and Outcome Reporting

Ads attribution is a separate roadmap phase after messaging is stable.

## Initial Attribution

For Click-to-WhatsApp, Messenger, or Instagram entry points, capture the `ctwa_clid` from the
referral object on the lead's first inbound message and store it with the Lead. Capturing that
referral value does not require the deeper Marketing API reporting permissions.

Add a `Campaign` entity so leads and outcomes can be connected to campaign context.

## Deeper Reporting

Campaign spend and cost-per-lead require Marketing API access, including `ads_read` and
`business_management` under the applicable Meta review model.

- Limited Access is sufficient for development against CRMPro-owned test assets.
- Production access to tenant ad accounts requires Full Access, App Review, and CRMPro Business
  Verification.
- Development must use the Marketing API Sandbox Ad Account; it provides simulated data and does
  not spend real money.
- Production automation must use System User tokens rather than personal user tokens, which are
  expected to expire after roughly 60 days.

## Differentiating Capability

When a lead reaches a qualified business outcome such as Closed Won, CRMPro should report that
outcome to Meta through Conversions API for Business Messaging and associate it with `ctwa_clid`.

This enables agencies to evaluate cost per sale rather than only cost per conversation and can
improve ad-delivery optimization.

---

# 6. Project Files

Project Files replaces the proposed AI-parsed unit-inventory feature for Phase 2.

The goal is a lightweight Project-scoped directory for developer price lists and inventory
spreadsheets. CRMPro stores the source document and makes its freshness and ownership clear; it
does not claim that the contents are normalized or current.

## Why Raw Files

AI parsing and normalization is deferred because incorrect extracted prices can look authoritative
and create more risk than an explicitly dated source file. AI-assisted parsing remains a possible
future experiment, not a committed roadmap item.

## Ingestion Flow

1. An agent forwards a file through WhatsApp to a designated number or group.
2. The webhook receiver immediately downloads the media and persists it to CRMPro-controlled
   object storage because Meta media URLs are short-lived.
3. CRMPro creates a `pending` Project File and records the sender and upload time.
4. The agent has approximately six hours to provide metadata: project, developer, custom name,
   labels, price range, area, version, and an optional supersede instruction.
5. CRMPro reminds the forwarder before the metadata deadline.
6. The agent approves the item into the Project directory.
7. If the deadline expires, CRMPro retains the file and surfaces it in a manager/admin queue. It
   must never silently delete an unlabeled or expired pending file.

The six-hour window is a metadata-completion target, not a file-retention policy.

## File Rules

- Deduplicate by content hash so repeated forwarding does not create duplicate pending items.
- Pre-fill metadata from prior submissions by the same sender and filename pattern using simple
  cached history; do not require AI.
- When an approved file uses the same label as an existing current file, mark the older file
  `superseded`.
- Keep superseded files available for history and auditability.

## Conceptual Data

`ProjectFile` requires:

- tenant and project ownership;
- label and custom display name;
- developer name;
- uploader/sender identity;
- upload timestamp;
- status: `pending`, `approved`, or `superseded`;
- optional price range, area, and version;
- content hash;
- stored object reference;
- supersession relationship and timestamps.

All Project File reads, writes, deduplication checks, and metadata suggestions must be tenant
scoped.

---

# Explicit Non-Decisions

Phase 2 does not commit CRMPro to:

- owning or reselling tenant Meta assets or message charges;
- usage-based messaging tiers;
- automatic cross-channel identity merging without an exact phone match;
- AI parsing of developer spreadsheets;
- live unit-level inventory management;
- a delivery date or final price point for any roadmap item.
