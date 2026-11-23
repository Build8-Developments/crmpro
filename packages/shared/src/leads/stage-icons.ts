/** Icon keys a pipeline stage may use (rendered by the web's icon map). */
export const STAGE_ICON_KEYS = [
  'sparkles',
  'phone',
  'message',
  'circle-check',
  'calendar',
  'map-pin',
  'home',
  'file-text',
  'handshake',
  'cash',
  'key',
  'clock',
  'star',
  'flame',
  'trophy',
  'circle-x',
] as const;
export type StageIconKey = (typeof STAGE_ICON_KEYS)[number];
