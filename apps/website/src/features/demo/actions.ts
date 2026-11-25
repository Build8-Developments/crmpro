"use server";

import { randomUUID } from "node:crypto";
import { SITE_URL } from "@/config/site";
import { hasLocale } from "@/i18n/config";
import { DEMO_FIELDS, TEAM_SIZES, UTM_FIELDS, type DemoFieldError, type DemoFormState } from "./types";

/**
 * Demo requests become leads in Nomow's own workspace, through the CRM's
 * inbound leads API (docs/api/inbound-leads.md). Server-side only:
 *   DEMO_LEADS_URL      https://<nomow-workspace>.nomow.app/api/v1/inbound/leads
 *   DEMO_LEADS_API_KEY  an API key from that workspace (Settings → Integrations)
 * Without them, development logs the request and reports success; production fails visibly.
 */
const LEADS_URL = process.env.DEMO_LEADS_URL;
const LEADS_KEY = process.env.DEMO_LEADS_API_KEY;
const TIMEOUT_MS = 8000;

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

  const localeValue = text(DEMO_FIELDS.locale);
  const locale = hasLocale(localeValue) ? localeValue : "en";
  const teamSize = (TEAM_SIZES as readonly string[]).includes(values.teamSize) ? values.teamSize : "";

  const lead = {
    fullName: values.name,
    phone: values.phone,
    source: "Website",
    // One id per form view: a retry or double submit never creates a second lead.
    externalId: `website-demo-${text(DEMO_FIELDS.requestId) || randomUUID()}`,
    message: [
      "Demo request from the website.",
      `Company: ${values.company}`,
      teamSize ? `Sales team: ${teamSize}` : null,
      `Language: ${locale}`,
      `Page: ${SITE_URL}/${locale}`,
    ]
      .filter(Boolean)
      .join("\n"),
    ...Object.fromEntries(UTM_FIELDS.map((key) => [key, text(key).slice(0, 200) || undefined])),
  };

  if (!LEADS_URL || !LEADS_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[demo request] DEMO_LEADS_URL / DEMO_LEADS_API_KEY not set; not sent:", lead);
      return { status: "success" };
    }
    console.error("[demo request] DEMO_LEADS_URL / DEMO_LEADS_API_KEY are not configured");
    return { status: "error", fieldErrors: [], failed: true, values };
  }

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
