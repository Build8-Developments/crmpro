/**
 * Origin of the socket.io gateway.
 *
 * The Next rewrite proxies only `/api/*`, not `/socket.io/*`, so the socket
 * needs a real origin. Preference: NEXT_PUBLIC_SSE_URL, then an absolute
 * NEXT_PUBLIC_API_URL, then the current host (when a reverse proxy routes
 * /socket.io there). Never a hardcoded localhost port: a misconfigured
 * production build should fail loudly, not dial a developer's machine.
 */
export function resolveSocketOrigin(): string | null {
  const toOrigin = (value: string | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
    return /^https?:\/\//.test(trimmed) ? trimmed : null;
  };

  return (
    toOrigin(process.env.NEXT_PUBLIC_SSE_URL) ??
    toOrigin(process.env.NEXT_PUBLIC_API_URL) ??
    (typeof window !== "undefined" ? window.location.origin : null)
  );
}
