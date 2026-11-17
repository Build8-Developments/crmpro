import { BadRequestException } from '@nestjs/common';

/** Lead fields a spreadsheet column can be mapped to (custom fields use `cf:<key>`). */
export const CORE_IMPORT_FIELDS = [
  'fullName',
  'primaryPhone',
  'secondaryPhone',
  'email',
  'source',
  'assignee',
  'project',
  'budgetMin',
  'budgetMax',
  'notes',
] as const;

export type CoreImportField = (typeof CORE_IMPORT_FIELDS)[number];

export const REQUIRED_IMPORT_FIELDS: readonly CoreImportField[] = [
  'fullName',
  'primaryPhone',
];

export const CUSTOM_FIELD_MAPPING_PREFIX = 'cf:';

export const CORE_IMPORT_FIELD_LABELS: Record<CoreImportField, string> = {
  fullName: 'Full name',
  primaryPhone: 'Phone',
  secondaryPhone: 'Secondary phone',
  email: 'Email',
  source: 'Source',
  assignee: 'Assigned agent (email or name)',
  project: 'Interested project(s)',
  budgetMin: 'Budget from',
  budgetMax: 'Budget to',
  notes: 'Notes',
};

/** field → zero-based column index. */
export type ImportMapping = Record<string, number>;

/**
 * Header spellings we recognise, English and Arabic (MSA + Egyptian/Gulf
 * usage). Compared after `normalizeHeader`, so case, spaces, punctuation,
 * diacritics and alef/yaa/taa-marbuta variants do not matter.
 */
const HEADER_SYNONYMS: Record<CoreImportField, string[]> = {
  fullName: [
    'fullName',
    'name',
    'full name',
    'lead name',
    'client name',
    'customer name',
    'contact name',
    'client',
    'customer',
    'الاسم',
    'اسم',
    'الاسم بالكامل',
    'الاسم الكامل',
    'اسم العميل',
    'العميل',
    'اسم الزبون',
  ],
  primaryPhone: [
    'primaryPhone',
    'phone',
    'mobile',
    'phone number',
    'mobile number',
    'primary phone',
    'cell',
    'tel',
    'telephone',
    'whatsapp',
    'whatsapp number',
    'رقم الموبايل',
    'الموبايل',
    'موبايل',
    'رقم الهاتف',
    'الهاتف',
    'هاتف',
    'التليفون',
    'رقم التليفون',
    'تليفون',
    'الجوال',
    'رقم الجوال',
    'جوال',
    'الرقم',
    'رقم',
    'واتساب',
    'رقم الواتساب',
    'رقم الواتس',
  ],
  secondaryPhone: [
    'secondaryPhone',
    'secondary phone',
    'phone 2',
    'mobile 2',
    'alternative phone',
    'alternate phone',
    'other phone',
    'second phone',
    'رقم اخر',
    'رقم آخر',
    'رقم تاني',
    'رقم ثاني',
    'موبايل 2',
    'رقم 2',
    'هاتف اخر',
    'هاتف 2',
    'رقم بديل',
  ],
  email: [
    'email',
    'e-mail',
    'mail',
    'email address',
    'البريد الالكتروني',
    'البريد الإلكتروني',
    'البريد',
    'الايميل',
    'الإيميل',
    'ايميل',
  ],
  source: [
    'sourceName',
    'source',
    'lead source',
    'channel',
    'campaign',
    'المصدر',
    'مصدر العميل',
    'مصدر',
    'القناة',
    'الحملة',
  ],
  assignee: [
    'assignedUserEmail',
    'assigned to',
    'assignee',
    'agent',
    'sales',
    'sales agent',
    'owner',
    'salesman',
    'المسؤول',
    'السيلز',
    'الموظف',
    'المندوب',
    'مسؤول المبيعات',
    'البائع',
  ],
  project: [
    'project',
    'projects',
    'interested project',
    'compound',
    'المشروع',
    'المشاريع',
    'مشروع',
    'الكمبوند',
    'المشروع المهتم به',
  ],
  budgetMin: [
    'budget',
    'budgetMin',
    'budget from',
    'min budget',
    'الميزانية',
    'الميزانيه',
    'الميزانية من',
    'الميزانية الادنى',
  ],
  budgetMax: [
    'budgetMax',
    'budget to',
    'max budget',
    'الميزانية الى',
    'الميزانية القصوى',
  ],
  notes: [
    'notes',
    'note',
    'comment',
    'comments',
    'remarks',
    'ملاحظات',
    'ملاحظة',
    'تعليق',
    'تعليقات',
  ],
};

/** Lowercases, unifies Arabic letter variants and drops everything but letters/digits. */
export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

const NORMALIZED_SYNONYMS = Object.fromEntries(
  CORE_IMPORT_FIELDS.map((field) => [
    field,
    [...new Set(HEADER_SYNONYMS[field].map(normalizeHeader))],
  ]),
) as Record<CoreImportField, string[]>;

export interface MappableCustomField {
  key: string;
  label: string;
}

/**
 * Best-guess column for each field. Exact matches win; then the longest
 * synonym contained in a header ("رقم موبايل العميل" → phone). Each field and
 * each column is used at most once.
 */
export function suggestMapping(
  headers: string[],
  customFields: MappableCustomField[],
): ImportMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: ImportMapping = {};
  const usedColumns = new Set<number>();

  const candidates: Array<{ field: string; synonyms: string[] }> = [
    ...CORE_IMPORT_FIELDS.map((field) => ({
      field,
      synonyms: NORMALIZED_SYNONYMS[field],
    })),
    ...customFields.map((definition) => ({
      field: `${CUSTOM_FIELD_MAPPING_PREFIX}${definition.key}`,
      synonyms: [
        ...new Set([
          normalizeHeader(definition.label),
          normalizeHeader(definition.key),
        ]),
      ].filter((value) => value.length > 0),
    })),
  ];

  const assign = (field: string, column: number) => {
    mapping[field] = column;
    usedColumns.add(column);
  };

  // Pass 1: exact matches.
  for (const { field, synonyms } of candidates) {
    const column = normalized.findIndex(
      (header, index) => !usedColumns.has(index) && synonyms.includes(header),
    );
    if (column !== -1) {
      assign(field, column);
    }
  }

  // Pass 2: longest contained synonym (at least 4 chars) across all fields.
  const matches: Array<{ field: string; column: number; length: number }> = [];
  normalized.forEach((header, column) => {
    if (usedColumns.has(column) || header.length === 0) return;
    for (const { field, synonyms } of candidates) {
      if (field in mapping) continue;
      for (const synonym of synonyms) {
        if (synonym.length >= 4 && header.includes(synonym)) {
          matches.push({ field, column, length: synonym.length });
        }
      }
    }
  });

  matches
    .sort((a, b) => b.length - a.length || a.column - b.column)
    .forEach(({ field, column }) => {
      if (!(field in mapping) && !usedColumns.has(column)) {
        assign(field, column);
      }
    });

  return mapping;
}

export function isKnownImportField(
  field: string,
  customFieldKeys: ReadonlySet<string>,
): boolean {
  if ((CORE_IMPORT_FIELDS as readonly string[]).includes(field)) {
    return true;
  }

  return (
    field.startsWith(CUSTOM_FIELD_MAPPING_PREFIX) &&
    customFieldKeys.has(field.slice(CUSTOM_FIELD_MAPPING_PREFIX.length))
  );
}

export function missingRequiredFields(mapping: ImportMapping): string[] {
  return REQUIRED_IMPORT_FIELDS.filter((field) => !(field in mapping));
}

/**
 * Structural validation of a user-supplied mapping. Column bounds are checked
 * against the real header row when the file is read.
 */
export function parseImportMapping(
  value: unknown,
  customFieldKeys: ReadonlySet<string>,
): ImportMapping {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('mapping must be an object');
  }

  const mapping: ImportMapping = {};
  const columns = new Set<number>();

  for (const [field, column] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (column === null || column === undefined) {
      continue;
    }

    if (!isKnownImportField(field, customFieldKeys)) {
      throw new BadRequestException(`Unknown import field "${field}"`);
    }

    if (
      typeof column !== 'number' ||
      !Number.isInteger(column) ||
      column < 0 ||
      column > 499
    ) {
      throw new BadRequestException(
        `Column for "${field}" must be a column index`,
      );
    }

    if (columns.has(column)) {
      throw new BadRequestException('Each column can be mapped to one field');
    }

    columns.add(column);
    mapping[field] = column;
  }

  const missing = missingRequiredFields(mapping);
  if (missing.length > 0) {
    throw new BadRequestException(
      `Map a column to: ${missing.map((field) => CORE_IMPORT_FIELD_LABELS[field as CoreImportField]).join(', ')}`,
    );
  }

  return mapping;
}
