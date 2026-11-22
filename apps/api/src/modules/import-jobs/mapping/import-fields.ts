import { BadRequestException } from '@nestjs/common';
import { toLatinDigits } from './import-values';

/** Lead fields a spreadsheet column can be mapped to. */
export const IMPORT_FIELDS = [
  'fullName',
  'primaryPhone',
  'secondaryPhone',
  'email',
  'source',
  'project',
  'notes',
  'budget',
  'budgetMin',
  'budgetMax',
  'occupation',
  'residenceArea',
  'paymentPreference',
  'contactChannelPreference',
  'contactTimePreference',
  'purchasePurpose',
  'assignee',
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

/** A column the importer chose not to import. */
export const IGNORE_FIELD = 'ignore';

export type ImportMappingTarget = ImportField | typeof IGNORE_FIELD;

/** File header → lead field (null / "ignore" = not imported). */
export type ImportMapping = Record<string, ImportMappingTarget | null>;

export const REQUIRED_IMPORT_FIELDS: readonly ImportField[] = [
  'fullName',
  'primaryPhone',
];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  fullName: 'Full name',
  primaryPhone: 'Phone',
  secondaryPhone: 'Second phone',
  email: 'Email',
  source: 'Source',
  project: 'Interested project(s)',
  notes: 'Notes',
  budget: 'Budget (single value or range)',
  budgetMin: 'Budget from',
  budgetMax: 'Budget to',
  occupation: 'Occupation',
  residenceArea: 'Residence area',
  paymentPreference: 'Payment preference',
  contactChannelPreference: 'Preferred contact channel',
  contactTimePreference: 'Preferred contact time',
  purchasePurpose: 'Purchase purpose',
  assignee: 'Assigned agent (email or name)',
};

/** Hard limits on a user-supplied mapping object. */
const MAX_MAPPING_ENTRIES = 500;
const MAX_HEADER_LENGTH = 300;

/**
 * Header spellings we recognise, English and Arabic (MSA + Egyptian usage).
 * Compared after `normalizeHeader`, so case, spaces, punctuation, diacritics,
 * Arabic-Indic digits and alef/yaa/taa-marbuta variants do not matter. The
 * legacy fixed CSV headers (sourceName, assignedUserEmail, contactChannel…)
 * are included so old templates keep importing unchanged.
 */
const HEADER_SYNONYMS: Record<ImportField, string[]> = {
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
    'الاسم ثلاثي',
    'اسم العميل',
    'العميل',
    'اسم الزبون',
  ],
  primaryPhone: [
    'primaryPhone',
    'phone',
    'phone 1',
    'mobile',
    'mobile 1',
    'phone number',
    'mobile number',
    'primary phone',
    'cell',
    'cell phone',
    'tel',
    'telephone',
    'whatsapp',
    'whatsapp number',
    'رقم الموبايل',
    'الموبايل',
    'موبايل',
    'موبايل 1',
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
    'رقم العميل',
    'موبايل العميل',
    'تليفون العميل',
  ],
  secondaryPhone: [
    'secondaryPhone',
    'secondary phone',
    'phone 2',
    'mobile 2',
    'phone number 2',
    'mobile number 2',
    'alternative phone',
    'alternate phone',
    'other phone',
    'second phone',
    'رقم اخر',
    'رقم تاني',
    'رقم ثاني',
    'موبايل 2',
    'موبايل تاني',
    'رقم 2',
    'هاتف 2',
    'هاتف اخر',
    'تليفون 2',
    'رقم الموبايل 2',
    'رقم بديل',
  ],
  email: [
    'email',
    'e-mail',
    'mail',
    'email address',
    'البريد الالكتروني',
    'البريد',
    'الايميل',
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
  project: [
    'project',
    'projects',
    'project name',
    'interested project',
    'interested in',
    'compound',
    'compounds',
    'المشروع',
    'المشاريع',
    'مشروع',
    'اسم المشروع',
    'الكمبوند',
    'المشروع المهتم به',
    'المشروع المطلوب',
  ],
  notes: [
    'notes',
    'note',
    'comment',
    'comments',
    'remarks',
    'message',
    'ملاحظات',
    'ملاحظة',
    'تعليق',
    'تعليقات',
    'الرسالة',
  ],
  budget: [
    'budget',
    'budget range',
    'price range',
    'الميزانية',
    'ميزانية',
    'الميزانية المتاحة',
    'الميزانية المتوقعة',
  ],
  budgetMin: [
    'budgetMin',
    'budget from',
    'min budget',
    'minimum budget',
    'الميزانية من',
    'اقل ميزانية',
    'الحد الادنى',
  ],
  budgetMax: [
    'budgetMax',
    'budget to',
    'max budget',
    'maximum budget',
    'الميزانية الى',
    'الميزانية حتى',
    'اقصى ميزانية',
    'الحد الاقصى',
  ],
  occupation: [
    'occupation',
    'job',
    'job title',
    'profession',
    'work',
    'الوظيفة',
    'وظيفة',
    'المهنة',
    'مهنة',
    'العمل',
  ],
  residenceArea: [
    'residenceArea',
    'residence',
    'residence area',
    'area',
    'location',
    'city',
    'district',
    'address',
    'المنطقة',
    'منطقة',
    'السكن',
    'منطقة السكن',
    'مكان السكن',
    'العنوان',
    'المدينة',
    'الحي',
  ],
  paymentPreference: [
    'paymentPreference',
    'payment',
    'payment method',
    'payment preference',
    'payment type',
    'طريقة الدفع',
    'الدفع',
    'نظام الدفع',
  ],
  contactChannelPreference: [
    'contactChannel',
    'contactChannelPreference',
    'contact channel',
    'preferred channel',
    'contact method',
    'وسيلة التواصل',
    'طريقة التواصل',
    'التواصل',
  ],
  contactTimePreference: [
    'contactTime',
    'contactTimePreference',
    'contact time',
    'best time',
    'preferred time',
    'time to call',
    'وقت التواصل',
    'وقت الاتصال',
    'الوقت المناسب',
    'افضل وقت',
  ],
  purchasePurpose: [
    'purchasePurpose',
    'purpose',
    'purchase purpose',
    'الغرض',
    'الغرض من الشراء',
    'هدف الشراء',
    'سبب الشراء',
  ],
  assignee: [
    'assignedUserEmail',
    'assigned user',
    'assigned to',
    'assignee',
    'agent',
    'agent email',
    'sales',
    'sales agent',
    'sales rep',
    'salesperson',
    'owner',
    'المسؤول',
    'المسئول',
    'السيلز',
    'الموظف',
    'المندوب',
    'مسؤول المبيعات',
    'البائع',
  ],
};

/**
 * Lowercases, maps Arabic-Indic digits to Latin, unifies Arabic letter
 * variants and drops everything but letters/digits.
 */
export function normalizeHeader(value: string): string {
  return toLatinDigits(value)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

const NORMALIZED_SYNONYMS = Object.fromEntries(
  IMPORT_FIELDS.map((field) => [
    field,
    [...new Set(HEADER_SYNONYMS[field].map(normalizeHeader))],
  ]),
) as Record<ImportField, string[]>;

/** Synonyms shorter than this never match as a substring ("رقم", "tel"). */
const MIN_CONTAINED_SYNONYM = 4;

/**
 * A numbered phone column ("Phone 2", "موبايل ٣", "رقم الموبايل 2") is a
 * second phone even when that exact spelling is not listed.
 */
function isNumberedPhoneHeader(normalized: string): boolean {
  const match = normalized.match(/^(.*\D)([2-9])$/);
  if (!match) return false;
  const base = match[1];
  return NORMALIZED_SYNONYMS.primaryPhone.some(
    (synonym) =>
      base === synonym ||
      (synonym.length >= MIN_CONTAINED_SYNONYM && base.includes(synonym)),
  );
}

/**
 * Best-guess field for each header. Exact matches win; then numbered phone
 * columns; then the longest synonym contained in a header ("رقم موبايل
 * العميل" → phone). Each field is used at most once; unmatched headers map
 * to null.
 */
export function suggestMapping(headers: string[]): ImportMapping {
  const normalized = headers.map(normalizeHeader);
  const byColumn: Array<ImportField | null> = headers.map(() => null);
  const usedFields = new Set<ImportField>();

  const assign = (column: number, field: ImportField) => {
    byColumn[column] = field;
    usedFields.add(field);
  };

  // Pass 1: exact matches, in field order (so "phone" beats "whatsapp").
  for (const field of IMPORT_FIELDS) {
    const column = normalized.findIndex(
      (header, index) =>
        byColumn[index] === null &&
        header.length > 0 &&
        NORMALIZED_SYNONYMS[field].includes(header),
    );
    if (column !== -1) assign(column, field);
  }

  // Pass 2: a numbered phone column is the second phone.
  if (!usedFields.has('secondaryPhone')) {
    const column = normalized.findIndex(
      (header, index) =>
        byColumn[index] === null && isNumberedPhoneHeader(header),
    );
    if (column !== -1) assign(column, 'secondaryPhone');
  }

  // Pass 3: longest contained synonym across all remaining fields.
  const matches: Array<{ field: ImportField; column: number; length: number }> =
    [];
  normalized.forEach((header, column) => {
    if (byColumn[column] !== null || header.length === 0) return;
    for (const field of IMPORT_FIELDS) {
      if (usedFields.has(field)) continue;
      for (const synonym of NORMALIZED_SYNONYMS[field]) {
        if (synonym.length >= MIN_CONTAINED_SYNONYM && header.includes(synonym))
          matches.push({ field, column, length: synonym.length });
      }
    }
  });
  matches
    .sort((a, b) => b.length - a.length || a.column - b.column)
    .forEach(({ field, column }) => {
      if (!usedFields.has(field) && byColumn[column] === null) {
        assign(column, field);
      }
    });

  const mapping: ImportMapping = {};
  headers.forEach((header, column) => {
    mapping[header] = byColumn[column];
  });
  return mapping;
}

export function isImportField(value: unknown): value is ImportField {
  return (
    typeof value === 'string' &&
    (IMPORT_FIELDS as readonly string[]).includes(value)
  );
}

/** Field → header for the fields that are actually imported. */
export function invertMapping(
  mapping: ImportMapping,
): Partial<Record<ImportField, string>> {
  const columns: Partial<Record<ImportField, string>> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (isImportField(field)) columns[field] = header;
  }
  return columns;
}

export function missingRequiredFields(mapping: ImportMapping): ImportField[] {
  const mapped = invertMapping(mapping);
  return REQUIRED_IMPORT_FIELDS.filter((field) => !mapped[field]);
}

export function describeMissingFields(fields: ImportField[]): string {
  return fields.map((field) => IMPORT_FIELD_LABELS[field]).join(', ');
}

/**
 * Structural validation of a user-supplied mapping: known field keys, each
 * field at most once, name + phone present. Whether the headers exist in the
 * file is checked when the file is read.
 */
export function parseImportMapping(value: unknown): ImportMapping {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('mapping must be an object');
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_MAPPING_ENTRIES) {
    throw new BadRequestException('mapping has too many columns');
  }

  const mapping: ImportMapping = {};
  const usedFields = new Set<ImportField>();

  for (const [header, target] of entries) {
    if (header.length > MAX_HEADER_LENGTH) {
      throw new BadRequestException(
        'mapping contains a header that is too long',
      );
    }

    if (target === null || target === undefined || target === IGNORE_FIELD) {
      mapping[header] = null;
      continue;
    }

    if (!isImportField(target)) {
      throw new BadRequestException(
        `Unknown import field ${JSON.stringify(target)} for column "${header}"`,
      );
    }

    if (usedFields.has(target)) {
      throw new BadRequestException(
        `${IMPORT_FIELD_LABELS[target]} is mapped to more than one column`,
      );
    }

    usedFields.add(target);
    mapping[header] = target;
  }

  const missing = missingRequiredFields(mapping);
  if (missing.length > 0) {
    throw new BadRequestException(
      `Map a column to: ${describeMissingFields(missing)}`,
    );
  }

  return mapping;
}
