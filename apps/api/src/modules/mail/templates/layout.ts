const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export interface BilingualBlock {
  /** Arabic paragraphs (MSA). */
  ar: string[];
  /** English paragraphs. */
  en: string[];
}

/**
 * Minimal, client-safe HTML: Arabic first (RTL), then English, one shared
 * call-to-action button. All dynamic values must be escaped by the caller.
 */
export function renderEmail(params: {
  heading: { ar: string; en: string };
  body: BilingualBlock;
  action?: { url: string; label: { ar: string; en: string } };
  footer: { ar: string; en: string };
}): { html: string; text: string } {
  const paragraphs = (lines: string[]) =>
    lines.map((line) => `<p style="margin:0 0 12px">${line}</p>`).join('');

  const button = params.action
    ? `<p style="margin:20px 0"><a href="${escapeHtml(params.action.url)}" style="background:#059669;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${params.action.label.ar} · ${params.action.label.en}</a></p>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#111827">
<div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
<div dir="rtl" lang="ar" style="text-align:right">
<h2 style="margin:0 0 16px;font-size:18px">${params.heading.ar}</h2>${paragraphs(params.body.ar)}
</div>
${button}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
<div dir="ltr" lang="en">
<h2 style="margin:0 0 16px;font-size:18px">${params.heading.en}</h2>${paragraphs(params.body.en)}
</div>
<p style="margin:24px 0 0;color:#6b7280;font-size:12px" dir="rtl">${params.footer.ar}</p>
<p style="margin:4px 0 0;color:#6b7280;font-size:12px">${params.footer.en}</p>
</div></body></html>`;

  const strip = (value: string) =>
    value
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  const text = [
    strip(params.heading.ar),
    ...params.body.ar.map(strip),
    '',
    strip(params.heading.en),
    ...params.body.en.map(strip),
    ...(params.action ? ['', params.action.url] : []),
  ].join('\n');

  return { html, text };
}
