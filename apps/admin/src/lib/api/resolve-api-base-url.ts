const DEFAULT_RELATIVE_BASE = "/api/v1";

/**
 * Resolves the CRM API base URL for fetch calls.
 *
 * Default `/api/v1` is same-origin; Next.js rewrites proxy to the Nest API so
 * httpOnly refresh cookies are stored on the web origin (not blocked cross-port).
 */
export function resolveApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_RELATIVE_BASE;

  if (
    configured.startsWith("http://") ||
    configured.startsWith("https://")
  ) {
    return configured.endsWith("/") ? configured : `${configured}/`;
  }

  const path = configured.startsWith("/") ? configured : `/${configured}`;
  const withTrailingSlash = path.endsWith("/") ? path : `${path}/`;

  if (typeof window !== "undefined") {
    return `${window.location.origin}${withTrailingSlash}`;
  }

  const proxyTarget =
    process.env.API_PROXY_TARGET ?? "http://localhost:3000";
  return `${proxyTarget}${withTrailingSlash}`;
}
