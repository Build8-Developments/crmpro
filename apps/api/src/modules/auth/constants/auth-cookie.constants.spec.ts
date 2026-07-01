import type { Response } from 'express';
import {
  buildRefreshCookieOptions,
  getRefreshCookieMaxAgeMs,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from './auth-cookie.constants';
import {
  clearRefreshCookie,
  setRefreshCookie,
} from '../utils/auth-cookie.util';

describe('auth-cookie.constants', () => {
  it('defines refresh cookie name and path', () => {
    expect(REFRESH_COOKIE_NAME).toBe('crm_refresh');
    expect(REFRESH_COOKIE_PATH).toBe('/api/v1/auth');
  });

  it('builds cookie options with production secure flag', () => {
    const production = buildRefreshCookieOptions('production', '7d');
    expect(production).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: getRefreshCookieMaxAgeMs('7d'),
    });

    const development = buildRefreshCookieOptions('development', '7d');
    expect(development.secure).toBe(false);
    expect(development.sameSite).toBe('lax');
  });

  it('builds cross-origin production cookie options when enabled', () => {
    const previous = process.env.REFRESH_COOKIE_CROSS_ORIGIN;
    process.env.REFRESH_COOKIE_CROSS_ORIGIN = 'true';

    try {
      const crossOrigin = buildRefreshCookieOptions('production', '7d', true);
      expect(crossOrigin).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: REFRESH_COOKIE_PATH,
        maxAge: getRefreshCookieMaxAgeMs('7d'),
      });
    } finally {
      if (previous === undefined) {
        delete process.env.REFRESH_COOKIE_CROSS_ORIGIN;
      } else {
        process.env.REFRESH_COOKIE_CROSS_ORIGIN = previous;
      }
    }
  });
});

describe('auth-cookie.util', () => {
  const config = {
    nodeEnv: 'development',
    refreshTokenExpiration: '7d',
  };

  let response: {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };

  beforeEach(() => {
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  it('setRefreshCookie sets cookie with expected options', () => {
    setRefreshCookie(response as unknown as Response, 'session.secret', config);

    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'session.secret',
      buildRefreshCookieOptions('development', '7d'),
    );
  });

  it('clearRefreshCookie clears cookie with matching path and flags', () => {
    clearRefreshCookie(response as unknown as Response, config);

    const options = buildRefreshCookieOptions('development', '7d');
    expect(response.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, {
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      path: options.path,
    });
  });
});
