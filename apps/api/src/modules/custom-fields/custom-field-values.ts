import { CustomFieldType } from '@crmpro/database';

export interface FieldDefinitionLike {
  key: string;
  label: string;
  type: CustomFieldType;
  options: unknown;
  isRequired: boolean;
}

export type CustomFieldValue = string | number | boolean | string[];

export class CustomFieldValidationError extends Error {
  constructor(readonly errors: Record<string, string>) {
    super('Invalid custom field values');
  }
}

function optionList(options: unknown): string[] {
  return Array.isArray(options)
    ? options.filter((option): option is string => typeof option === 'string')
    : [];
}

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Coerces one raw value to the field type; returns an error message on failure. */
function coerce(
  definition: FieldDefinitionLike,
  raw: unknown,
): { value?: CustomFieldValue; error?: string } {
  switch (definition.type) {
    case CustomFieldType.TEXT: {
      if (typeof raw !== 'string' && typeof raw !== 'number') {
        return { error: 'must be text' };
      }
      const text = String(raw).trim();
      return text.length > 500 ? { error: 'is too long' } : { value: text };
    }
    case CustomFieldType.NUMBER: {
      const number =
        typeof raw === 'string' ? Number(raw.replace(/,/g, '')) : raw;
      return typeof number === 'number' && Number.isFinite(number)
        ? { value: number }
        : { error: 'must be a number' };
    }
    case CustomFieldType.DATE: {
      const date = typeof raw === 'string' ? new Date(raw) : null;
      return date && !Number.isNaN(date.getTime())
        ? { value: date.toISOString().slice(0, 10) }
        : { error: 'must be a date (YYYY-MM-DD)' };
    }
    case CustomFieldType.BOOLEAN: {
      if (typeof raw === 'boolean') return { value: raw };
      if (raw === 'true' || raw === 'yes') return { value: true };
      if (raw === 'false' || raw === 'no') return { value: false };
      return { error: 'must be true or false' };
    }
    case CustomFieldType.URL: {
      if (typeof raw !== 'string') return { error: 'must be a URL' };
      try {
        const url = new URL(raw.trim());
        return ['http:', 'https:'].includes(url.protocol)
          ? { value: url.toString() }
          : { error: 'must be an http(s) URL' };
      } catch {
        return { error: 'must be a URL' };
      }
    }
    case CustomFieldType.SELECT: {
      const options = optionList(definition.options);
      return typeof raw === 'string' && options.includes(raw)
        ? { value: raw }
        : { error: `must be one of: ${options.join(', ')}` };
    }
    case CustomFieldType.MULTI_SELECT: {
      const options = optionList(definition.options);
      const values = Array.isArray(raw) ? raw : [raw];
      return values.every(
        (value) => typeof value === 'string' && options.includes(value),
      )
        ? { value: [...new Set(values as string[])] }
        : { error: `values must be among: ${options.join(', ')}` };
    }
  }
}

/**
 * Validates submitted custom field values against the tenant's active
 * definitions and merges them into the existing values. Unknown keys are
 * rejected, `null`/empty clears a value, and required fields must end up set
 * (on create, or when a required value is being cleared).
 */
export function mergeCustomFieldValues(
  definitions: FieldDefinitionLike[],
  existing: Record<string, unknown> | null,
  submitted: Record<string, unknown> | undefined,
  options: { creating: boolean },
): Record<string, CustomFieldValue> {
  const byKey = new Map(
    definitions.map((definition) => [definition.key, definition]),
  );
  const result: Record<string, CustomFieldValue> = {};
  const errors: Record<string, string> = {};

  // Keep existing values for fields that are still defined.
  for (const [key, value] of Object.entries(existing ?? {})) {
    if (byKey.has(key) && !isEmpty(value)) {
      result[key] = value as CustomFieldValue;
    }
  }

  for (const [key, raw] of Object.entries(submitted ?? {})) {
    const definition = byKey.get(key);

    if (!definition) {
      errors[key] = 'is not a known field';
      continue;
    }

    if (isEmpty(raw)) {
      delete result[key];
      continue;
    }

    const { value, error } = coerce(definition, raw);
    if (error) {
      errors[key] = `${definition.label} ${error}`;
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  for (const definition of definitions) {
    const touched = submitted !== undefined && definition.key in submitted;
    if (
      definition.isRequired &&
      (options.creating || touched) &&
      isEmpty(result[definition.key]) &&
      // Keep the more specific error (e.g. "must be one of …").
      !errors[definition.key]
    ) {
      errors[definition.key] = `${definition.label} is required`;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new CustomFieldValidationError(errors);
  }

  return result;
}
