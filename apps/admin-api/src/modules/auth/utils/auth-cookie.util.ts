import type { Request, Response } from 'express';
import {
  ADMIN_REFRESH_COOKIE_NAME,
  buildAdminRefreshCookieOptions,
} from '../constants/auth-cookie.constants';

export interface AdminRefreshCookieConfig {
  nodeEnv: string;
  refreshExpiration: string;
  refreshCookieCrossOrigin: boolean;
}

function options(config: AdminRefreshCookieConfig) {
  return buildAdminRefreshCookieOptions(
    config.nodeEnv,
    config.refreshExpiration,
    config.refreshCookieCrossOrigin,
  );
}

export function readAdminRefreshCookie(request: Request): string | null {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[ADMIN_REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function setAdminRefreshCookie(
  response: Response,
  token: string,
  config: AdminRefreshCookieConfig,
): void {
  response.cookie(ADMIN_REFRESH_COOKIE_NAME, token, options(config));
}

export function clearAdminRefreshCookie(
  response: Response,
  config: AdminRefreshCookieConfig,
): void {
  const { httpOnly, secure, sameSite, path } = options(config);
  response.clearCookie(ADMIN_REFRESH_COOKIE_NAME, {
    httpOnly,
    secure,
    sameSite,
    path,
  });
}
