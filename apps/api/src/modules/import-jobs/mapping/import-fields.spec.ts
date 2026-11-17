import { BadRequestException } from '@nestjs/common';
import {
  normalizeHeader,
  parseImportMapping,
  suggestMapping,
} from './import-fields';
import {
  cleanImportedPhone,
  normalizeImportedDate,
  parseImportedAmount,
  parseImportedBoolean,
  splitImportedList,
  toLatinDigits,
} from './import-values';

describe('import header matching', () => {
  it('normalizes Arabic spelling variants', () => {
    expect(normalizeHeader('الإسم')).toBe(normalizeHeader('الاسم'));
    expect(normalizeHeader('الميزانيّة')).toBe(normalizeHeader('الميزانيه'));
    expect(normalizeHeader('Phone_Number ')).toBe('phonenumber');
  });

  it('maps Arabic headers to lead fields', () => {
    const mapping = suggestMapping(
      [
        'الاسم',
        'رقم الموبايل',
        'رقم تاني',
        'البريد الإلكتروني',
        'المصدر',
        'المشروع',
        'ملاحظات',
        'نوع الوحدة',
      ],
      [{ key: 'unit_type', label: 'نوع الوحدة' }],
    );

    expect(mapping).toEqual({
      fullName: 0,
      primaryPhone: 1,
      secondaryPhone: 2,
      email: 3,
      source: 4,
      project: 5,
      notes: 6,
      'cf:unit_type': 7,
    });
  });

  it('keeps legacy template headers working', () => {
    expect(
      suggestMapping(
        ['fullName', 'primaryPhone', 'secondaryPhone', 'assignedUserEmail'],
        [],
      ),
    ).toEqual({
      fullName: 0,
      primaryPhone: 1,
      secondaryPhone: 2,
      assignee: 3,
    });
  });

  it('falls back to the longest contained synonym', () => {
    const mapping = suggestMapping(
      ['Client Full Name', 'Mobile Number (WhatsApp)', 'Phone 2'],
      [],
    );

    expect(mapping.fullName).toBe(0);
    expect(mapping.primaryPhone).toBe(1);
    expect(mapping.secondaryPhone).toBe(2);
  });

  it('never maps one column to two fields', () => {
    const mapping = suggestMapping(['Phone', 'Phone'], []);
    expect(Object.values(mapping)).toEqual([0]);
  });

  it('validates user mappings', () => {
    const keys = new Set(['unit_type']);

    expect(
      parseImportMapping(
        { fullName: 0, primaryPhone: 1, 'cf:unit_type': 2, email: null },
        keys,
      ),
    ).toEqual({ fullName: 0, primaryPhone: 1, 'cf:unit_type': 2 });
    expect(() => parseImportMapping({ fullName: 0 }, keys)).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseImportMapping({ fullName: 0, primaryPhone: 0 }, keys),
    ).toThrow('Each column can be mapped to one field');
    expect(() =>
      parseImportMapping({ fullName: 0, primaryPhone: 1, 'cf:nope': 2 }, keys),
    ).toThrow('Unknown import field');
  });
});

describe('import value cleanup', () => {
  it('converts Arabic-Indic digits', () => {
    expect(toLatinDigits('٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
  });

  it('restores the trunk zero Excel drops from phone numbers', () => {
    expect(cleanImportedPhone('1012345678', 'EG')).toBe('01012345678');
    expect(cleanImportedPhone('501234567', 'SA')).toBe('0501234567');
    expect(cleanImportedPhone('+201012345678', 'EG')).toBe('+201012345678');
    expect(cleanImportedPhone('1012345678', 'US')).toBe('1012345678');
  });

  it('parses budgets written by hand', () => {
    expect(parseImportedAmount('1,500,000')).toBe(1_500_000);
    expect(parseImportedAmount('2.5M')).toBe(2_500_000);
    expect(parseImportedAmount('٣ مليون')).toBe(3_000_000);
    expect(parseImportedAmount('750k')).toBe(750_000);
    expect(parseImportedAmount('')).toBeUndefined();
    expect(parseImportedAmount('call me')).toBeNull();
  });

  it('handles lists, booleans and day-first dates', () => {
    expect(splitImportedList('Mivida، Zed, Palm Hills')).toEqual([
      'Mivida',
      'Zed',
      'Palm Hills',
    ]);
    expect(parseImportedBoolean('نعم')).toBe(true);
    expect(parseImportedBoolean('No')).toBe(false);
    expect(normalizeImportedDate('7/3/2026')).toBe('2026-03-07');
    expect(normalizeImportedDate('2026-03-07')).toBe('2026-03-07');
  });
});
