import { CustomFieldType } from '@crmpro/database';
import {
  CustomFieldValidationError,
  mergeCustomFieldValues,
  type FieldDefinitionLike,
} from './custom-field-values';

const definitions: FieldDefinitionLike[] = [
  {
    key: 'unit_type',
    label: 'Unit type',
    type: CustomFieldType.SELECT,
    options: ['Apartment', 'Villa'],
    isRequired: true,
  },
  {
    key: 'bedrooms',
    label: 'Bedrooms',
    type: CustomFieldType.NUMBER,
    options: null,
    isRequired: false,
  },
  {
    key: 'move_in',
    label: 'Move-in date',
    type: CustomFieldType.DATE,
    options: null,
    isRequired: false,
  },
  {
    key: 'cash_buyer',
    label: 'Cash buyer',
    type: CustomFieldType.BOOLEAN,
    options: null,
    isRequired: false,
  },
  {
    key: 'amenities',
    label: 'Amenities',
    type: CustomFieldType.MULTI_SELECT,
    options: ['Pool', 'Gym'],
    isRequired: false,
  },
];

function errorsOf(run: () => unknown): Record<string, string> {
  try {
    run();
  } catch (error) {
    if (error instanceof CustomFieldValidationError) return error.errors;
    throw error;
  }
  throw new Error('expected validation error');
}

describe('mergeCustomFieldValues', () => {
  it('coerces values to their field types', () => {
    expect(
      mergeCustomFieldValues(
        definitions,
        null,
        {
          unit_type: 'Villa',
          bedrooms: '4',
          move_in: '2027-03-01',
          cash_buyer: 'yes',
          amenities: ['Pool', 'Pool', 'Gym'],
        },
        { creating: true },
      ),
    ).toEqual({
      unit_type: 'Villa',
      bedrooms: 4,
      move_in: '2027-03-01',
      cash_buyer: true,
      amenities: ['Pool', 'Gym'],
    });
  });

  it('enforces required fields on create and rejects unknown keys and bad options', () => {
    expect(
      errorsOf(() =>
        mergeCustomFieldValues(definitions, null, {}, { creating: true }),
      ),
    ).toEqual({
      unit_type: 'Unit type is required',
    });

    const errors = errorsOf(() =>
      mergeCustomFieldValues(
        definitions,
        null,
        { unit_type: 'Castle', hacked: 'x', bedrooms: 'many' },
        { creating: true },
      ),
    );
    expect(Object.keys(errors).sort()).toEqual([
      'bedrooms',
      'hacked',
      'unit_type',
    ]);
    expect(errors.unit_type).toBe('Unit type must be one of: Apartment, Villa');
  });

  it('merges updates, clears with null and keeps untouched values', () => {
    expect(
      mergeCustomFieldValues(
        definitions,
        { unit_type: 'Apartment', bedrooms: 2, removed_field: 'old' },
        { bedrooms: null, cash_buyer: false },
        { creating: false },
      ),
    ).toEqual({ unit_type: 'Apartment', cash_buyer: false });
  });

  it('does not let an update clear a required field', () => {
    expect(
      errorsOf(() =>
        mergeCustomFieldValues(
          definitions,
          { unit_type: 'Villa' },
          { unit_type: '' },
          { creating: false },
        ),
      ),
    ).toEqual({ unit_type: 'Unit type is required' });
  });
});
