import { BadRequestException } from '@nestjs/common';
import {
  missingRequiredFields,
  normalizeHeader,
  parseImportMapping,
  suggestMapping,
} from './import-fields';

describe('normalizeHeader', () => {
  it('ignores case, spacing, punctuation and Arabic letter variants', () => {
    expect(normalizeHeader(' Full-Name ')).toBe('fullname');
    expect(normalizeHeader('البريد الإلكتروني')).toBe(
      normalizeHeader('البريد الالكتروني'),
    );
    expect(normalizeHeader('الميزاني\u0640\u0640\u0640ة')).toBe(
      normalizeHeader('الميزانيه'),
    );
    expect(normalizeHeader('موبايل ٢')).toBe('موبايل2');
  });
});

describe('suggestMapping', () => {
  it('maps the legacy English template headers', () => {
    const mapping = suggestMapping([
      'fullName',
      'primaryPhone',
      'secondaryPhone',
      'email',
      'sourceName',
      'assignedUserEmail',
      'occupation',
      'residenceArea',
      'paymentPreference',
      'contactChannel',
      'contactTime',
      'purchasePurpose',
      'budgetMin',
      'budgetMax',
    ]);

    expect(mapping).toEqual({
      fullName: 'fullName',
      primaryPhone: 'primaryPhone',
      secondaryPhone: 'secondaryPhone',
      email: 'email',
      sourceName: 'source',
      assignedUserEmail: 'assignee',
      occupation: 'occupation',
      residenceArea: 'residenceArea',
      paymentPreference: 'paymentPreference',
      contactChannel: 'contactChannelPreference',
      contactTime: 'contactTimePreference',
      purchasePurpose: 'purchasePurpose',
      budgetMin: 'budgetMin',
      budgetMax: 'budgetMax',
    });
  });

  it('maps everyday English headers', () => {
    expect(
      suggestMapping([
        'Name',
        'Mobile Number',
        'Phone 2',
        'E-mail',
        'Lead Source',
        'Project',
        'Budget',
        'Comments',
        'Random column',
      ]),
    ).toEqual({
      Name: 'fullName',
      'Mobile Number': 'primaryPhone',
      'Phone 2': 'secondaryPhone',
      'E-mail': 'email',
      'Lead Source': 'source',
      Project: 'project',
      Budget: 'budget',
      Comments: 'notes',
      'Random column': null,
    });
  });

  it('maps Arabic headers', () => {
    expect(
      suggestMapping([
        'الاسم بالكامل',
        'رقم الموبايل',
        'موبايل ٢',
        'البريد الإلكتروني',
        'المصدر',
        'المشروع',
        'الميزانية',
        'الوظيفة',
        'المنطقة/السكن',
        'طريقة الدفع',
        'ملاحظات',
      ]),
    ).toEqual({
      'الاسم بالكامل': 'fullName',
      'رقم الموبايل': 'primaryPhone',
      'موبايل ٢': 'secondaryPhone',
      'البريد الإلكتروني': 'email',
      المصدر: 'source',
      المشروع: 'project',
      الميزانية: 'budget',
      الوظيفة: 'occupation',
      'المنطقة/السكن': 'residenceArea',
      'طريقة الدفع': 'paymentPreference',
      ملاحظات: 'notes',
    });
  });

  it('recognises other common Arabic spellings', () => {
    expect(suggestMapping(['الاسم', 'الهاتف', 'رقم الموبايل 2'])).toEqual({
      الاسم: 'fullName',
      الهاتف: 'primaryPhone',
      'رقم الموبايل 2': 'secondaryPhone',
    });
  });

  it('uses each field once and prefers the longest contained synonym', () => {
    const mapping = suggestMapping([
      'Client name',
      'Customer name',
      'اسم المشروع',
      'رقم موبايل العميل',
    ]);

    expect(mapping['Client name']).toBe('fullName');
    expect(mapping['Customer name']).toBeNull();
    expect(mapping['اسم المشروع']).toBe('project');
    expect(mapping['رقم موبايل العميل']).toBe('primaryPhone');
  });
});

describe('parseImportMapping', () => {
  it('accepts header → field maps and treats null / "ignore" as skipped', () => {
    expect(
      parseImportMapping({
        الاسم: 'fullName',
        Mobile: 'primaryPhone',
        Extra: 'ignore',
        Other: null,
      }),
    ).toEqual({
      الاسم: 'fullName',
      Mobile: 'primaryPhone',
      Extra: null,
      Other: null,
    });
  });

  it('rejects unknown fields, repeated fields and missing name/phone', () => {
    expect(() =>
      parseImportMapping({ A: 'fullName', B: 'primaryPhone', C: 'salary' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseImportMapping({ A: 'fullName', B: 'primaryPhone', C: 'fullName' }),
    ).toThrow(/more than one column/);
    expect(() => parseImportMapping({ A: 'fullName' })).toThrow(/Phone/);
    expect(() => parseImportMapping(['fullName'])).toThrow(BadRequestException);
  });

  it('reports which required fields are missing', () => {
    expect(missingRequiredFields({ A: 'email' })).toEqual([
      'fullName',
      'primaryPhone',
    ]);
  });
});
