/**
 * A level is announced only when it was not yet reached this long ago, so
 * the first evaluation on existing history writes old levels silently
 * (no notification flood), and a level crossed by a late (back-dated) record
 * is still announced.
 */
export const ACHIEVEMENT_NOTIFICATION_WINDOW_MS = 48 * 60 * 60_000;

/** Where badge notifications link to. */
export const PERFORMANCE_HREF = '/performance';
