"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { SITE_URL } from "@/config/site";
import { hasLocale } from "@/i18n/config";
import { sendDemoEmail } from "./mail";
import { DEMO_FIELDS, TEAM_SIZES, UTM_FIELDS, type DemoFieldError, type DemoFormState } from "./types";

/**
 * A demo request is delivered one of two ways (server-side settings only, never NEXT_PUBLIC):
 *
 * 1. As a lead in Nomow's own workspace, through the CRM's inbound leads API
 *    (docs/api/inbound-leads.md), once production has that workspace:
 *      DEMO_LEADS_URL      https://<nomow-workspace>.nomow.app/api/v1/inbound/leads
 *      DEMO_LEADS_API_KEY  an API key from that workspace (Settings → Integrations)
 * 2. Until then, as an email to the team, over SMTP (Resend on the server, like the API's mail):
 *      DEMO_EMAIL_TO, SITE_MAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 *
 * With neither, development logs the request and reports success; production fails visibly
 * (the form then offers the contact address).
 */
const LEADS_URL = process.env.DEMO_LEADS_URL;
const LEADS_KEY = process.env.DEMO_LEADS_API_KEY;
const EMAIL_TO = process.env.DEMO_EMAIL_TO;
const TIMEOUT_MS = 8000;

// Abuse limits for one server process (the site runs as a single container): a visitor (by the
// client address the project Caddy forwards) may send a few requests an hour, and the whole site a
// few hundred a day, so a bot can't flood the inbox. Real people send one.
const PER_VISITOR = { max: 5, windowMs: 60 * 60 * 1000 };
const PER_DAY = { max: 300, windowMs: 24 * 60 * 60 * 1000 };
const visitors = new Map<string, number[]>();
let daily: number[] = [];

function allowed(visitor: string, now: number): boolean {
  daily = daily.filter((time) => now - time < PER_DAY.windowMs);
  const recent = (visitors.get(visitor) ?? []).filter((time) => now - time < PER_VISITOR.windowMs);
  if (recent.length >= PER_VISITOR.max || daily.length >= PER_DAY.max) {
    visitors.set(visitor, recent);
    return false;
  }
  recent.push(now);
  visitors.set(visitor, recent);
  daily.push(now);
  if (visitors.size > 5000) visitors.clear(); // bounded memory; at worst the limits reset early
  return true;
}

// One id per form view: a retry or double submit is sent once (the leads API dedupes by
// externalId itself; email needs this).
const sent = new Map<string, number>();
function alreadySent(requestId: string, now: number): boolean {
  for (const [id, time] of sent) if (now - time > PER_DAY.windowMs) sent.delete(id);
  if (sent.has(requestId)) return true;
  sent.set(requestId, now);
  return false;
}

export async function requestDemo(_previous: DemoFormState, formData: FormData): Promise<DemoFormState> {
  const text = (key: string) => String(formData.get(key) ?? "").trim().replace(/\s+/g, " ");
  const values = {
    name: text(DEMO_FIELDS.name),
    phone: text(DEMO_FIELDS.phone),
    company: text(DEMO_FIELDS.company),
    teamSize: text(DEMO_FIELDS.teamSize),
  };

  // Bots fill every field; people never see this one. Pretend it worked.
  if (text(DEMO_FIELDS.trap)) return { status: "success" };

  const fieldErrors: DemoFieldError[] = [];
  if (values.name.length < 2 || values.name.length > 120) fieldErrors.push("name");
  const phoneDigits = values.phone.replace(/[^\d]/g, "");
  if (!/^\+?[\d\s\-().]+$/.test(values.phone) || phoneDigits.length < 8 || phoneDigits.length > 15) {
    fieldErrors.push("phone");
  }
  if (values.company.length < 2 || values.company.length > 160) fieldErrors.push("company");
  if (fieldErrors.length > 0) return { status: "error", fieldErrors, failed: false, values };

  const now = Date.now();
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const visitor = forwarded.split(",")[0]?.trim() || "unknown";
  if (!allowed(visitor, now)) {
    console.warn(`[demo request] limit reached for ${visitor}`);
    return { status: "error", fieldErrors: [], failed: true, values };
  }

  const localeValue = text(DEMO_FIELDS.locale);
  const locale = hasLocale(localeValue) ? localeValue : "en";
  const teamSize = (TEAM_SIZES as readonly string[]).includes(values.teamSize) ? values.teamSize : "";
  const requestId = text(DEMO_FIELDS.requestId).slice(0, 64) || randomUUID();
  const utm = Object.fromEntries(UTM_FIELDS.map((key) => [key, text(key).slice(0, 200) || undefined]));

  const lead = {
    fullName: values.name,
    phone: values.phone,
    source: "Website",
    externalId: `website-demo-${requestId}`,
    message: [
      "Demo request from the website.",
      `Company: ${values.company}`,
      teamSize ? `Sales team: ${teamSize}` : null,
      `Language: ${locale}`,
      `Page: ${SITE_URL}/${locale}`,
    ]
      .filter(Boolean)
      .join("\n"),
    ...utm,
  };

  if (LEADS_URL && LEADS_KEY) {
    try {
      const response = await fetch(LEADS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LEADS_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      // 201 created; 200 duplicate_request / resubmitted (same phone, open lead) also mean "we have it".
      if (response.ok) return { status: "success" };
      console.error(`[demo request] inbound leads API answered ${response.status}: ${await response.text()}`);
    } catch (error) {
      console.error("[demo request] could not reach the inbound leads API", error);
    }
    return { status: "error", fieldErrors: [], failed: true, values };
  }

  if (EMAIL_TO && process.env.SMTP_HOST) {
    if (alreadySent(requestId, now)) return { status: "success" };
    try {
      await sendDemoEmail({
        to: EMAIL_TO,
        name: values.name,
        phone: values.phone,
        company: values.company,
        teamSize,
        locale,
        page: `${SITE_URL}/${locale}`,
        utm,
      });
      return { status: "success" };
    } catch (error) {
      sent.delete(requestId); // let the visitor try again
      console.error("[demo request] could not send the email", error);
      return { status: "error", fieldErrors: [], failed: true, values };
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[demo request] no delivery configured (DEMO_LEADS_* or DEMO_EMAIL_TO); not sent:", lead);
    return { status: "success" };
  }
  console.error("[demo request] no delivery configured: set DEMO_LEADS_URL + DEMO_LEADS_API_KEY or DEMO_EMAIL_TO + SMTP_*");
  return { status: "error", fieldErrors: [], failed: true, values };
}
