import { CustomFieldType } from '@crmpro/database';
import {
  importedCustomFieldValue,
  parseImportedDate,
} from './import-custom-fields';
import { parseImportMapping, suggestMapping } from './import-fields';

const of = (type: CustomFieldType, options: string[] | null = null) => ({
  type,
  options,
});

describe('parseImportedDate', () => {
  it.each([
    ['2026-03-05', '2026-03-05'],
    ['2026-03-05T00:00:00.000Z', '2026-03-05'],
    ['2026/3/5', '2026-03-05'],
    ['5/3/2026', '2026-03-05'],
    ['05-03-2026', '2026-03-05'],
    ['٥/٣/٢٠٢٦', '2026-03-05'],
    ['next week', 'next week'],
  ])('%s → %s', (input, output) => {
    expect(parseImportedDate(input)).toBe(output);
  });
});

describe('importedCustomFieldValue', () => {
  it('reads yes/no words in English and Arabic', () => {
    const boolean = of(CustomFieldType.BOOLEAN);
    expect(importedCustomFieldValue(boolean, 'Yes')).toBe(true);
    expect(importedCustomFieldValue(boolean, 'نعم')).toBe(true);
    expect(importedCustomFieldValue(boolean, 'لا')).toBe(false);
    expect(importedCustomFieldValue(boolean, 'maybe')).toBe('maybe');
  });

  it('matches options regardless of case and Arabic letter variants', () => {
    const select = of(CustomFieldType.SELECT, ['Villa', 'شقة']);
    expect(importedCustomFieldValue(select, ' VILLA ')).toBe('Villa');
    expect(importedCustomFieldValue(select, 'شقه')).toBe('شقة');
    expect(importedCustomFieldValue(select, 'Loft')).toBe('Loft');
  });

  it('splits multi-select cells unless the whole cell is an option', () => {
    const multi = of(CustomFieldType.MULTI_SELECT, [
      'Pool',
      'Gym',
      '1/2 floor',
    ]);
    expect(importedCustomFieldValue(multi, 'pool، gym')).toEqual([
      'Pool',
      'Gym',
    ]);
    expect(importedCustomFieldValue(multi, '1/2 floor')).toEqual(['1/2 floor']);
  });

  it('cleans numbers and bare links, and leaves blanks empty', () => {
    expect(importedCustomFieldValue(of(CustomFieldType.NUMBER), '١٬٢٥٠')).toBe(
      '1250',
    );
    expect(
      importedCustomFieldValue(of(CustomFieldType.URL), 'www.example.com/a'),
    ).toBe('https://www.example.com/a');
    expect(importedCustomFieldValue(of(CustomFieldType.TEXT), '  ')).toBe('');
  });
});

describe('custom field targets in the import mapping', () => {
  it('suggests a custom field whose label is the header', () => {
    expect(
      suggestMapping(
        ['الاسم', 'الموبايل', 'نوع  الوحدة', 'Floor'],
        [
          { key: 'unit_type', label: 'نوع الوحدة' },
          { key: 'floor', label: 'Preferred floor' },
        ],
      ),
    ).toEqual({
      الاسم: 'fullName',
      الموبايل: 'primaryPhone',
      'نوع  الوحدة': 'custom:unit_type',
      // The key matches too.
      Floor: 'custom:floor',
    });
  });

  it('accepts custom targets once each and rejects malformed ones', () => {
    expect(
      parseImportMapping({
        Name: 'fullName',
        Phone: 'primaryPhone',
        Unit: 'custom:unit_type',
      }),
    ).toEqual({
      Name: 'fullName',
      Phone: 'primaryPhone',
      Unit: 'custom:unit_type',
    });

    expect(() =>
      parseImportMapping({
        Name: 'fullName',
        Phone: 'primaryPhone',
        A: 'custom:unit_type',
        B: 'custom:unit_type',
      }),
    ).toThrow('mapped to more than one column');

    expect(() =>
      parseImportMapping({
        Name: 'fullName',
        Phone: 'primaryPhone',
        A: 'custom:Not-A-Key',
      }),
    ).toThrow('Unknown import field');
  });
});
