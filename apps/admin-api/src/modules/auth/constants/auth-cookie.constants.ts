import ms, { StringValue } from 'ms';

/** Distinct from the tenant app's `crm_refresh` so the two never overwrite each other. */
export const ADMIN_REFRESH_COOKIE_NAME = 'crm_admin_refresh';
export const ADMIN_REFRESH_COOKIE_PATH = '/api/v1/auth';

export interface AdminRefreshCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'none';
  path: string;
  maxAge: number;
}

/**
 * Same rules as the tenant API: SameSite=Lax for the proxied same-origin admin app;
 * SameSite=None; Secure only when `auth.refreshCookieCrossOrigin` is on in production.
 */
export function buildAdminRefreshCookieOptions(
  nodeEnv: string,
  refreshExpiration: string,
  crossOrigin: boolean,
): AdminRefreshCookieOptions {
  const isProduction = nodeEnv === 'production';
  const useCrossOrigin = isProduction && crossOrigin;
  const maxAge = ms(refreshExpiration as StringValue);

  if (maxAge === undefined) {
    throw new Error('Invalid JWT_REFRESH_EXPIRATION');
  }

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: useCrossOrigin ? 'none' : 'lax',
    path: ADMIN_REFRESH_COOKIE_PATH,
    maxAge,
  };
}
