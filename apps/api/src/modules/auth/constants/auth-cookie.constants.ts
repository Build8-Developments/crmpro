import ms, { StringValue } from 'ms';

export const REFRESH_COOKIE_NAME = 'crm_refresh';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export interface RefreshCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

export function getRefreshCookieMaxAgeMs(refreshTokenExpiration: string): number {
  const duration = ms(refreshTokenExpiration as StringValue);

  if (duration === undefined) {
    throw new Error('Invalid REFRESH_TOKEN_EXPIRATION');
  }

  return duration;
}

export function buildRefreshCookieOptions(
  nodeEnv: string,
  refreshTokenExpiration: string,
): RefreshCookieOptions {
  return {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: getRefreshCookieMaxAgeMs(refreshTokenExpiration),
  };
}
