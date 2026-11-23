import { CustomFieldType } from '@crmpro/database';
import {
  coerceCustomFieldValue,
  CustomFieldValidationError,
  mergeCustomFieldValues,
  toStoredCustomFields,
  type CustomFieldDefinitionLike,
} from './custom-field-values';

function field(
  key: string,
  type: CustomFieldType,
  extra: Partial<CustomFieldDefinitionLike> = {},
): CustomFieldDefinitionLike {
  return {
    key,
    label: key.replace(/_/g, ' '),
    type,
    options: null,
    isRequired: false,
    archivedAt: null,
    ...extra,
  };
}

const definitions: CustomFieldDefinitionLike[] = [
  field('unit_type', CustomFieldType.SELECT, {
    label: 'Unit type',
    options: ['Apartment', 'Villa'],
    isRequired: true,
  }),
  field('bedrooms', CustomFieldType.NUMBER),
  field('move_in', CustomFieldType.DATE),
  field('cash_buyer', CustomFieldType.BOOLEAN),
  field('amenities', CustomFieldType.MULTI_SELECT, {
    options: ['Pool', 'Gym', 'Garden'],
  }),
  field('listing', CustomFieldType.URL),
  field('notes', CustomFieldType.TEXT),
  field('old_code', CustomFieldType.TEXT, {
    label: 'Old code',
    archivedAt: new Date('2026-11-01'),
  }),
];

function errorsOf(run: () => unknown): Record<string, string> {
  try {
    run();
  } catch (error) {
    if (error instanceof CustomFieldValidationError) return error.errors;
    throw error;
  }
  throw new Error('expected a validation error');
}

describe('coerceCustomFieldValue', () => {
  const coerce = (type: CustomFieldType, raw: unknown, options?: string[]) =>
    coerceCustomFieldValue({ type, options: options ?? null }, raw);

  it('accepts finite numbers and numeric strings only', () => {
    expect(coerce(CustomFieldType.NUMBER, 3)).toEqual({ ok: true, value: 3 });
    expect(coerce(CustomFieldType.NUMBER, '1,250.5')).toEqual({
      ok: true,
      value: 1250.5,
    });
    expect(coerce(CustomFieldType.NUMBER, Infinity).ok).toBe(false);
    expect(coerce(CustomFieldType.NUMBER, '0x10').ok).toBe(false);
    expect(coerce(CustomFieldType.NUMBER, '3 rooms').ok).toBe(false);
  });

  it('accepts real YYYY-MM-DD calendar dates only', () => {
    expect(coerce(CustomFieldType.DATE, '2026-02-28')).toEqual({
      ok: true,
      value: '2026-02-28',
    });
    expect(coerce(CustomFieldType.DATE, '2026-02-30').ok).toBe(false);
    expect(coerce(CustomFieldType.DATE, '28/02/2026').ok).toBe(false);
    expect(coerce(CustomFieldType.DATE, '2026-02-28T10:00:00Z').ok).toBe(false);
  });

  it('accepts http(s) links only', () => {
    expect(coerce(CustomFieldType.URL, ' https://example.com/a ')).toEqual({
      ok: true,
      value: 'https://example.com/a',
    });
    expect(coerce(CustomFieldType.URL, 'javascript:alert(1)').ok).toBe(false);
    expect(coerce(CustomFieldType.URL, 'ftp://example.com').ok).toBe(false);
    expect(coerce(CustomFieldType.URL, 'example.com').ok).toBe(false);
  });

  it('caps text at 1000 characters', () => {
    expect(coerce(CustomFieldType.TEXT, 'x'.repeat(1000)).ok).toBe(true);
    expect(coerce(CustomFieldType.TEXT, 'x'.repeat(1001)).ok).toBe(false);
  });

  it('checks select values against the options', () => {
    expect(coerce(CustomFieldType.SELECT, 'Villa', ['Villa']).ok).toBe(true);
    expect(coerce(CustomFieldType.SELECT, 'villa', ['Villa']).ok).toBe(false);
    expect(
      coerce(
        CustomFieldType.MULTI_SELECT,
        ['Gym', 'Gym', 'Pool'],
        ['Pool', 'Gym'],
      ),
    ).toEqual({ ok: true, value: ['Gym', 'Pool'] });
    expect(
      coerce(CustomFieldType.MULTI_SELECT, ['Gym', 'Sauna'], ['Gym']).ok,
    ).toBe(false);
    expect(coerce(CustomFieldType.MULTI_SELECT, 'Gym', ['Gym']).ok).toBe(false);
  });

  it('accepts booleans (and "true"/"false")', () => {
    expect(coerce(CustomFieldType.BOOLEAN, false)).toEqual({
      ok: true,
      value: false,
    });
    expect(coerce(CustomFieldType.BOOLEAN, 'true')).toEqual({
      ok: true,
      value: true,
    });
    expect(coerce(CustomFieldType.BOOLEAN, 'maybe').ok).toBe(false);
  });
});

describe('mergeCustomFieldValues', () => {
  it('coerces values on create and enforces required fields', () => {
    expect(
      mergeCustomFieldValues({
        definitions,
        existing: null,
        submitted: {
          unit_type: 'Villa',
          bedrooms: '4',
          cash_buyer: true,
          amenities: ['Pool'],
        },
        required: 'all',
      }),
    ).toEqual({
      unit_type: 'Villa',
      bedrooms: 4,
      cash_buyer: true,
      amenities: ['Pool'],
    });

    expect(
      errorsOf(() =>
        mergeCustomFieldValues({
          definitions,
          existing: null,
          submitted: undefined,
          required: 'all',
        }),
      ),
    ).toEqual({ unit_type: 'Unit type is required' });
  });

  it('keeps archived and unknown keys on update (merge, never replace)', () => {
    const existing = {
      unit_type: 'Apartment',
      old_code: 'A-17',
      preferredUnit: 'Corner unit',
    };

    expect(
      mergeCustomFieldValues({
        definitions,
        existing,
        submitted: { bedrooms: 3 },
        required: 'all',
      }),
    ).toEqual({
      unit_type: 'Apartment',
      old_code: 'A-17',
      preferredUnit: 'Corner unit',
      bedrooms: 3,
    });
  });

  it('rejects unknown keys and archived fields on write', () => {
    expect(
      errorsOf(() =>
        mergeCustomFieldValues({
          definitions,
          existing: { unit_type: 'Villa', old_code: 'A-17' },
          submitted: { old_code: 'B-2', preferredUnit: 'x' },
          required: 'all',
        }),
      ),
    ).toEqual({
      old_code: 'Old code is archived and can no longer be edited',
      preferredUnit: '"preferredUnit" is not a custom field',
    });
  });

  it('clears a value with null, "" or []', () => {
    expect(
      mergeCustomFieldValues({
        definitions,
        existing: { unit_type: 'Villa', notes: 'x', amenities: ['Gym'] },
        submitted: { notes: '  ', amenities: [], bedrooms: null },
        required: 'all',
      }),
    ).toEqual({ unit_type: 'Villa' });
  });

  it('refuses to clear a required field when the edit touches custom fields', () => {
    expect(
      errorsOf(() =>
        mergeCustomFieldValues({
          definitions,
          existing: { unit_type: 'Villa' },
          submitted: { unit_type: null },
          required: 'all',
        }),
      ),
    ).toEqual({ unit_type: 'Unit type is required' });
  });

  it('skips required checks when the edit does not touch custom fields', () => {
    expect(
      mergeCustomFieldValues({
        definitions,
        existing: { bedrooms: 2 },
        submitted: undefined,
        required: 'none',
      }),
    ).toEqual({ bedrooms: 2 });
  });

  it('checks only submitted required fields for import rows', () => {
    expect(
      mergeCustomFieldValues({
        definitions,
        existing: null,
        submitted: { bedrooms: '2' },
        required: 'submitted',
      }),
    ).toEqual({ bedrooms: 2 });

    expect(
      errorsOf(() =>
        mergeCustomFieldValues({
          definitions,
          existing: null,
          submitted: { unit_type: '' },
          required: 'submitted',
        }),
      ),
    ).toEqual({ unit_type: 'Unit type is required' });
  });

  it('keeps an unchanged value whose option was removed since', () => {
    const narrowed = definitions.map((definition) =>
      definition.key === 'unit_type'
        ? { ...definition, options: ['Apartment'] }
        : definition,
    );

    expect(
      mergeCustomFieldValues({
        definitions: narrowed,
        existing: { unit_type: 'Villa' },
        submitted: { unit_type: 'Villa', bedrooms: 1 },
        required: 'all',
      }),
    ).toEqual({ unit_type: 'Villa', bedrooms: 1 });

    // …but it cannot be newly picked.
    expect(
      errorsOf(() =>
        mergeCustomFieldValues({
          definitions: narrowed,
          existing: { unit_type: 'Apartment' },
          submitted: { unit_type: 'Villa' },
          required: 'all',
        }),
      ),
    ).toEqual({ unit_type: 'Unit type must be one of the listed options' });
  });

  it('reports every bad value with the field label', () => {
    const error = (() => {
      try {
        mergeCustomFieldValues({
          definitions,
          existing: { unit_type: 'Villa' },
          submitted: { bedrooms: 'many', listing: 'not a link' },
          required: 'all',
        });
      } catch (caught) {
        return caught as CustomFieldValidationError;
      }
      throw new Error('expected a validation error');
    })();

    expect(error.errors).toEqual({
      bedrooms: 'bedrooms must be a number',
      listing: 'listing must be a link starting with http(s)://',
    });
    expect(error.message).toBe(
      'bedrooms must be a number; listing must be a link starting with http(s)://',
    );
  });
});

describe('toStoredCustomFields', () => {
  it('turns null and malformed JSON into an empty object', () => {
    expect(toStoredCustomFields(null)).toEqual({});
    expect(toStoredCustomFields(['a'])).toEqual({});
    expect(toStoredCustomFields('x')).toEqual({});
    expect(toStoredCustomFields({ a: 1 })).toEqual({ a: 1 });
  });
});
