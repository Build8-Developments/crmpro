export const AUTH_RATE_LIMIT_METADATA_KEY = 'authRateLimit';

/**
 * login / refresh: sign-in. password-reset: "forgot password" requests (they
 * send email). account-token: using an emailed link (reset, invitation).
 */
export type AuthRateLimitKind =
  | 'login'
  | 'refresh'
  | 'password-reset'
  | 'account-token';

export const RATE_LIMIT_CONFIG_KEYS = {
  plane: 'app.name',
  windowSeconds: 'rateLimit.windowSeconds',
  loginPerEmail: 'rateLimit.loginPerEmail',
  loginPerIp: 'rateLimit.loginPerIp',
  refreshPerIp: 'rateLimit.refreshPerIp',
} as const;

export const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 900;
export const DEFAULT_LOGIN_PER_EMAIL_LIMIT = 5;
export const DEFAULT_LOGIN_PER_IP_LIMIT = 20;
export const DEFAULT_REFRESH_PER_IP_LIMIT = 60;
export const DEFAULT_PASSWORD_RESET_PER_EMAIL_LIMIT = 3;
export const DEFAULT_PASSWORD_RESET_PER_IP_LIMIT = 10;
export const DEFAULT_ACCOUNT_TOKEN_PER_IP_LIMIT = 20;

// Both backends share one Redis, so keys carry the plane name: without it the
// tenant and admin planes would decrement the same counter and could lock each
// other out. Both configuration files set app.name; this only keeps keys
// well-formed if that is ever missing.
export const RATE_LIMIT_KEY_PREFIX = 'rate-limit';
export const DEFAULT_RATE_LIMIT_PLANE = 'default';

// RFC 5321 caps an address at 254 characters; longer input is not an email and
// must not become an unbounded Redis key.
export const MAX_EMAIL_KEY_LENGTH = 254;

export const RATE_LIMIT_MESSAGE = 'Too many requests. Please try again later.';

// This client sits in the request path of login, so a wedged Redis must cost
// milliseconds, not the client's own timeout.
export const RATE_LIMIT_COMMAND_TIMEOUT_MS = 500;

// INCR and PEXPIRE must be atomic. A key left without a TTL would block that
// client permanently, and these keys contain IP addresses and emails.
export const CONSUME_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {current, redis.call('PTTL', KEYS[1])}
`;
