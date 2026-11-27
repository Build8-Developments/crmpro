import type { Request } from 'express';
import type { RequestSecurityMetadata } from '../auth.types';

function getHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

/**
 * The client address as Express resolves it under `trust proxy`
 * (TRUST_PROXY_HOPS), the same value the rate limits use. Reading the first
 * X-Forwarded-For entry directly would trust whatever the client sent.
 */
function getClientIp(req: Request): string | undefined {
  return req.ip || req.socket.remoteAddress;
}

export function extractRequestSecurityMetadata(
  req: Request,
  deviceNameFromBody?: string,
): RequestSecurityMetadata {
  return {
    deviceName: deviceNameFromBody ?? getHeader(req, 'x-device-name') ?? null,
    ipAddress: getClientIp(req) ?? null,
    userAgent: getHeader(req, 'user-agent') ?? null,
    fingerprint: getHeader(req, 'x-device-fingerprint') ?? null,
    // Set by Cloudflare on every proxied request; the origin only accepts
    // traffic through Cloudflare. Nothing upstream provides a city.
    country: getHeader(req, 'cf-ipcountry') ?? null,
    city: null,
  };
}
