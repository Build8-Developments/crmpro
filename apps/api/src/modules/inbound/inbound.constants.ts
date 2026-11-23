/** Requests one key may make per window (Zapier/Make bursts fit easily). */
export const INBOUND_PER_KEY_LIMIT = 60;
export const INBOUND_PER_KEY_WINDOW_SECONDS = 60;

/**
 * Failed key lookups one IP may make per window before every request from it
 * is refused. Generous because Zapier/Make share egress IPs across customers.
 */
export const INBOUND_BAD_KEY_PER_IP_LIMIT = 30;
export const INBOUND_BAD_KEY_WINDOW_SECONDS = 900;

/** lastUsedAt is written at most this often per key. */
export const API_KEY_TOUCH_INTERVAL_MS = 60_000;

/** A Redis peek in the request path must cost milliseconds, never seconds. */
export const INBOUND_REDIS_PEEK_TIMEOUT_MS = 250;

/** One "client came back" alert per lead and recipient per hour. */
export const RESUBMISSION_NOTIFY_BUCKET_MS = 3_600_000;

export const MAX_PROJECT_IDS = 10;

export const INBOUND_MESSAGES = {
  MISSING_KEY:
    'Missing API key. Send it as "Authorization: Bearer <key>" or "X-Api-Key: <key>".',
  INVALID_KEY: 'API key is invalid or has been revoked.',
  PLAN_REQUIRED:
    "API access isn't included in this workspace's plan. Ask the workspace owner to upgrade to send leads by API.",
  RATE_LIMITED: 'Too many requests for this API key. Please slow down.',
  BLOCKED:
    'Too many failed attempts from this address. Please try again later.',
  NO_PIPELINE:
    'The workspace has no default pipeline configured, so the lead cannot be placed.',
} as const;
