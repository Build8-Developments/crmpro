# Plan 08 — Email, Password Reset, Invitations

**Goal:** users can recover their own accounts and be invited by email; notifications can follow them to their inbox.
**Order:** eighth.
**Status:** ☑ complete

---

## 1. Mail infrastructure ✅

- `apps/api/src/modules/mail`: `MailService.send()` enqueues on a BullMQ `mail` queue (5 attempts, exponential backoff); worker delivers through nodemailer SMTP or, with `MAIL_TRANSPORT=log` (default), prints the message.
- Env: `MAIL_TRANSPORT`, `MAIL_FROM`, `SMTP_HOST/PORT/SECURE/USER/PASS`, `APP_WEB_URL` (Joi-validated, documented in `apps/api/.env.example`).
- Bilingual templates (Arabic RTL first, then English), all dynamic values HTML-escaped: password reset, invitation, notification copy.
- Local: Mailpit added to `docker/docker-compose.local.yml` (SMTP 1025, UI 8025; override with `MAILPIT_SMTP_PORT` / `MAILPIT_UI_PORT`). Also fixed the Postgres healthcheck port and dropped the obsolete `version` key (Plan 05 §6).

## 2. Single-use tokens ✅

- `UserToken { type: PASSWORD_RESET|INVITE, tokenHash (sha256), expiresAt, usedAt }` — raw 256-bit tokens only exist in the emailed link; issuing a token retires older ones; consumption is an atomic conditional update.

## 3. Password reset ✅

- `POST /auth/forgot-password` always answers 200 with the same message (no account enumeration); throttled per IP; per-user 60 s cooldown; skips pending invitees and inaccessible tenants. Link valid 30 minutes.
- `POST /auth/reset-password` sets the password, revokes every session, audits `USER_PASSWORD_RESET_SELF`.

## 4. Invitations ✅

- `POST /users/invite` (`user.create`): same email/role-escalation/quota checks as direct creation; user gets an unusable random password and `invitedAt`; link valid 7 days. `POST /users/:id/resend-invite` for pending invites.
- `GET /auth/invitations/:token` (page details) and `POST /auth/accept-invite` (sets password, `inviteAcceptedAt`). Users list exposes `invitationPending`.
- Direct creation with a password still works.

## 5. Email notifications ✅

- `NotificationPreference.emailEnabled` (default off) per category; `EmailNotificationChannel` sends a copy with a deep link (lead drawer when the notification is about a lead); never throws, so in-app delivery is never retried because of SMTP.

## 6. Web ✅

- Public pages `/forgot-password`, `/reset-password`, `/accept-invite` (added to the proxy allow-list); "Forgot password?" link on the sign-in step.
- Users: "Invite by email" dialog, "Invitation pending" badge, "Resend invitation" action.
- Settings → Notifications: In-app / Email columns.

**Accept (verified live against Mailpit):** invite email arrives → login refused before acceptance → accept → login works; token reuse rejected; reset email arrives; unknown emails get the same response; old password stops working after reset.

---

## Out of scope
2FA (deferred), admin-api owner invitations, per-user email digests.

## Definition of done
No admin has to type or relay passwords anymore; every emailed link is single-use, expiring and hashed at rest.
