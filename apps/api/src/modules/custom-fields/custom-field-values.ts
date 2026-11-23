import { CustomFieldType } from '@crmpro/database';
import {
  CUSTOM_FIELD_NUMBER_MAX_ABS,
  CUSTOM_FIELD_TEXT_MAX_LENGTH,
  CUSTOM_FIELD_URL_MAX_LENGTH,
} from './custom-fields.constants';

/** What value validation needs from a definition (active or archived). */
export interface CustomFieldDefinitionLike {
  key: string;
  label: string;
  type: CustomFieldType;
  options: unknown;
  isRequired: boolean;
  archivedAt: Date | null;
}

export type CustomFieldValue = string | number | boolean | string[];

/**
 * Stored `Lead.customFields`: values keyed by definition key. Keys of
 * archived definitions, and keys no definition knows (older data), are kept
 * as they are.
 */
export type StoredCustomFields = Record<string, unknown>;

/**
 * Which required (active) fields must have a value after the write:
 * - all: every one (a new lead, or an edit that touches customFields)
 * - submitted: only those present in the submission (an import row: an
 *   unmapped column never blocks the row)
 * - none: nothing is checked (an edit that does not touch customFields)
 */
export type RequiredFieldCheck = 'all' | 'submitted' | 'none';

export class CustomFieldValidationError extends Error {
  /** Definition key → readable message. */
  constructor(readonly errors: Record<string, string>) {
    super(Object.values(errors).join('; ') || 'Invalid custom field values');
  }
}

/** SELECT / MULTI_SELECT choices; anything malformed counts as no options. */
export function customFieldOptions(options: unknown): string[] {
  return Array.isArray(options)
    ? options.filter((option): option is string => typeof option === 'string')
    : [];
}

export function isEmptyCustomFieldValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** `Lead.customFields` JSON → a plain object (null / malformed → {}). */
export function toStoredCustomFields(value: unknown): StoredCustomFields {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as StoredCustomFields) }
    : {};
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DECIMAL = /^-?\d+(\.\d+)?$/;

function isCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

type Coerced =
  | { ok: true; value: CustomFieldValue }
  | { ok: false; error: string };

/** One non-empty raw value → the stored value for the field type. */
export function coerceCustomFieldValue(
  definition: Pick<CustomFieldDefinitionLike, 'type' | 'options'>,
  raw: unknown,
): Coerced {
  switch (definition.type) {
    case CustomFieldType.TEXT: {
      if (typeof raw !== 'string' && typeof raw !== 'number') {
        return { ok: false, error: 'must be text' };
      }
      const text = String(raw).trim();
      return text.length > CUSTOM_FIELD_TEXT_MAX_LENGTH
        ? {
            ok: false,
            error: `must be at most ${CUSTOM_FIELD_TEXT_MAX_LENGTH} characters`,
          }
        : { ok: true, value: text };
    }

    case CustomFieldType.NUMBER: {
      let number: number | null = null;
      if (typeof raw === 'number') {
        number = raw;
      } else if (typeof raw === 'string') {
        const text = raw.trim().replace(/,/g, '');
        number = DECIMAL.test(text) ? Number(text) : null;
      }
      return number !== null &&
        Number.isFinite(number) &&
        Math.abs(number) <= CUSTOM_FIELD_NUMBER_MAX_ABS
        ? { ok: true, value: number }
        : { ok: false, error: 'must be a number' };
    }

    case CustomFieldType.DATE: {
      const text = typeof raw === 'string' ? raw.trim() : '';
      return isCalendarDate(text)
        ? { ok: true, value: text }
        : { ok: false, error: 'must be a date (YYYY-MM-DD)' };
    }

    case CustomFieldType.BOOLEAN: {
      if (typeof raw === 'boolean') return { ok: true, value: raw };
      if (raw === 'true') return { ok: true, value: true };
      if (raw === 'false') return { ok: true, value: false };
      return { ok: false, error: 'must be yes or no' };
    }

    case CustomFieldType.URL: {
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (text.length === 0 || text.length > CUSTOM_FIELD_URL_MAX_LENGTH) {
        return { ok: false, error: 'must be a link starting with http(s)://' };
      }
      try {
        const url = new URL(text);
        return (url.protocol === 'http:' || url.protocol === 'https:') &&
          url.hostname.length > 0
          ? { ok: true, value: text }
          : { ok: false, error: 'must be a link starting with http(s)://' };
      } catch {
        return { ok: false, error: 'must be a link starting with http(s)://' };
      }
    }

    case CustomFieldType.SELECT: {
      const options = customFieldOptions(definition.options);
      const text = typeof raw === 'string' ? raw.trim() : null;
      return text !== null && options.includes(text)
        ? { ok: true, value: text }
        : { ok: false, error: 'must be one of the listed options' };
    }

    case CustomFieldType.MULTI_SELECT: {
      const options = customFieldOptions(definition.options);
      if (!Array.isArray(raw)) {
        return { ok: false, error: 'must be a list of options' };
      }
      const values = (raw as unknown[]).map((item) =>
        typeof item === 'string' ? item.trim() : item,
      );
      return values.every(
        (item): item is string =>
          typeof item === 'string' && options.includes(item),
      )
        ? { ok: true, value: [...new Set(values)] }
        : { ok: false, error: 'must only use the listed options' };
    }
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Validates submitted values and merges them into the stored ones (merge,
 * never replace):
 * - keys that are not submitted keep their stored value, including keys of
 *   archived fields and keys no definition knows;
 * - unknown keys and archived fields are rejected on write;
 * - null / "" / [] clears a value;
 * - an unchanged value is kept as is, so a SELECT whose option was removed
 *   since stays valid when the form sends it back;
 * - required active fields are checked per `required`.
 *
 * Throws CustomFieldValidationError (key → message) when anything is wrong.
 */
export function mergeCustomFieldValues(params: {
  definitions: readonly CustomFieldDefinitionLike[];
  existing: unknown;
  submitted: Record<string, unknown> | undefined;
  required: RequiredFieldCheck;
}): StoredCustomFields {
  const byKey = new Map(
    params.definitions.map((definition) => [definition.key, definition]),
  );
  const existing = toStoredCustomFields(params.existing);
  const result: StoredCustomFields = { ...existing };
  const errors: Record<string, string> = {};
  const submitted = params.submitted ?? {};

  for (const [key, raw] of Object.entries(submitted)) {
    const definition = byKey.get(key);

    if (!definition) {
      errors[key] = `"${key}" is not a custom field`;
      continue;
    }

    if (definition.archivedAt) {
      errors[key] =
        `${definition.label} is archived and can no longer be edited`;
      continue;
    }

    if (isEmptyCustomFieldValue(raw)) {
      delete result[key];
      continue;
    }

    if (key in existing && sameValue(existing[key], raw)) {
      continue;
    }

    const coerced = coerceCustomFieldValue(definition, raw);
    if (coerced.ok) {
      result[key] = coerced.value;
    } else {
      errors[key] = `${definition.label} ${coerced.error}`;
    }
  }

  if (params.required !== 'none') {
    for (const definition of params.definitions) {
      if (!definition.isRequired || definition.archivedAt) continue;
      if (errors[definition.key]) continue;
      if (params.required === 'submitted' && !(definition.key in submitted)) {
        continue;
      }
      if (isEmptyCustomFieldValue(result[definition.key])) {
        errors[definition.key] = `${definition.label} is required`;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new CustomFieldValidationError(errors);
  }

  return result;
}
