export const ORGANIZATION_AUDIT_ACTIONS = {
  UPDATED: 'ORGANIZATION_UPDATED',
  SETTINGS_UPDATED: 'ORGANIZATION_SETTINGS_UPDATED',
  LOGO_UPDATED: 'ORGANIZATION_LOGO_UPDATED',
  LOGO_REMOVED: 'ORGANIZATION_LOGO_REMOVED',
} as const;

export const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/** Raster only: SVG can carry script and is served from our bucket. */
export const LOGO_ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

/** Signed logo URLs are long-lived enough for a working session. */
export const LOGO_URL_EXPIRY_SECONDS = 6 * 60 * 60;
