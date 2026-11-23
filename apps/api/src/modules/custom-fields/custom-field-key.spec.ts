import {
  deriveUniqueCustomFieldKey,
  slugifyCustomFieldKey,
} from './custom-field-key';
import { CUSTOM_FIELD_KEY_PATTERN } from './custom-fields.constants';

describe('slugifyCustomFieldKey', () => {
  it.each([
    ['Unit type', 'unit_type'],
    ['  Préférence  de étage! ', 'preference_de_etage'],
    ['2nd phone owner', 'field_2nd_phone_owner'],
    ['نوع الوحدة', 'field'],
    ['---', 'field'],
  ])('%s → %s', (label, key) => {
    expect(slugifyCustomFieldKey(label)).toBe(key);
  });

  it('always yields a key the database accepts', () => {
    for (const label of [
      'x'.repeat(80),
      `a${'_b'.repeat(30)}`,
      '9',
      'Ünïcödé',
      'نوع الوحدة 2',
    ]) {
      expect(slugifyCustomFieldKey(label)).toMatch(CUSTOM_FIELD_KEY_PATTERN);
    }
  });
});

describe('deriveUniqueCustomFieldKey', () => {
  it('adds a numeric suffix when the key is taken (archived keys too)', () => {
    expect(deriveUniqueCustomFieldKey('Unit type', new Set())).toBe(
      'unit_type',
    );
    expect(
      deriveUniqueCustomFieldKey('Unit type', new Set(['unit_type'])),
    ).toBe('unit_type_2');
    expect(
      deriveUniqueCustomFieldKey(
        'Unit type',
        new Set(['unit_type', 'unit_type_2']),
      ),
    ).toBe('unit_type_3');
  });

  it('stays within 40 characters with a suffix', () => {
    const label = 'a'.repeat(60);
    const key = deriveUniqueCustomFieldKey(label, new Set(['a'.repeat(40)]));
    expect(key).toBe(`${'a'.repeat(38)}_2`);
    expect(key).toMatch(CUSTOM_FIELD_KEY_PATTERN);
  });
});
