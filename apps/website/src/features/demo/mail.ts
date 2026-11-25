import { createTransport, type Transporter } from "nodemailer";

/**
 * Demo requests by email (see actions.ts), over the same SMTP settings the CRM's API uses: on the
 * server that is Resend (SMTP_PASS is its API key); in the deploy rehearsal, Mailpit.
 */
let transport: Transporter | undefined;

function smtp(): Transporter {
  transport ??= createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

export async function sendDemoEmail(request: {
  to: string;
  name: string;
  phone: string;
  company: string;
  teamSize: string;
  locale: string;
  page: string;
  utm: Record<string, string | undefined>;
}): Promise<void> {
  const campaign = Object.entries(request.utm).filter(([, value]) => value);
  const lines = [
    "A demo request from the website.",
    "",
    `Name:        ${request.name}`,
    `Phone:       ${request.phone}`,
    `Company:     ${request.company}`,
    `Sales team:  ${request.teamSize || "not given"}`,
    `Language:    ${request.locale === "ar" ? "Arabic" : "English"}`,
    `Page:        ${request.page}`,
    ...(campaign.length > 0 ? ["", ...campaign.map(([key, value]) => `${key}: ${value}`)] : []),
  ];

  await smtp().sendMail({
    from: process.env.SITE_MAIL_FROM || "Nomow Website <no-reply@mail.nomow.app>",
    to: request.to,
    subject: `Demo request: ${request.company} (${request.name})`,
    text: lines.join("\n"),
  });
}
