/**
 * Website settings. Every value is baked in at build time (NEXT_PUBLIC_*), so the
 * image is built per environment, as for apps/web. See `.env.example`.
 */
function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** This site's origin: canonical URLs, hreflang links, sitemap, Open Graph. */
export const SITE_URL = trimSlash(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3003");

/** "Sign in" for existing customers: the CRM's "find my workspace" page (served by apps/web). */
export const FIND_WORKSPACE_URL =
  process.env.NEXT_PUBLIC_FIND_WORKSPACE_URL || "http://localhost:3001/login";

/** Public contact address (footer, and the fallback when the demo form can't send). */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@nomow.app";
