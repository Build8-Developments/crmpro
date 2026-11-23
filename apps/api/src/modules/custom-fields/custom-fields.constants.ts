import { CustomFieldType } from '@crmpro/database';

/** Active (not archived) lead fields a tenant may have at once. */
export const MAX_ACTIVE_CUSTOM_FIELDS = 50;

/** Matches the DB CHECK on CustomFieldDefinition.key. */
export const CUSTOM_FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
export const CUSTOM_FIELD_KEY_MAX_LENGTH = 40;

export const CUSTOM_FIELD_LABEL_MAX_LENGTH = 60;
export const CUSTOM_FIELD_DESCRIPTION_MAX_LENGTH = 200;
export const CUSTOM_FIELD_MAX_OPTIONS = 100;
export const CUSTOM_FIELD_OPTION_MAX_LENGTH = 80;

/** Longest TEXT value. */
export const CUSTOM_FIELD_TEXT_MAX_LENGTH = 1000;
export const CUSTOM_FIELD_URL_MAX_LENGTH = 2000;
/** NUMBER values stay well inside the exactly-representable range. */
export const CUSTOM_FIELD_NUMBER_MAX_ABS = 1e15;

/** Types whose values are picked from `options`. */
export const OPTION_FIELD_TYPES: readonly CustomFieldType[] = [
  CustomFieldType.SELECT,
  CustomFieldType.MULTI_SELECT,
];

export const CUSTOM_FIELD_AUDIT_ENTITY = 'CustomFieldDefinition';

export const CUSTOM_FIELD_AUDIT_ACTIONS = {
  CREATED: 'CUSTOM_FIELD_CREATED',
  UPDATED: 'CUSTOM_FIELD_UPDATED',
  ARCHIVED: 'CUSTOM_FIELD_ARCHIVED',
  RESTORED: 'CUSTOM_FIELD_RESTORED',
  REORDERED: 'CUSTOM_FIELDS_REORDERED',
} as const;
