import { CustomFieldType } from '@crmpro/database';
import {
  customFieldOptions,
  type CustomFieldDefinitionLike,
} from '../../custom-fields/custom-field-values';
import { CUSTOM_FIELD_TEXT_MAX_LENGTH } from '../../custom-fields/custom-fields.constants';
import {
  normalizeLookupKey,
  splitImportedList,
  toLatinDigits,
} from './import-values';

/** Bidi marks and other invisible characters spreadsheets leave in cells. */
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

const TRUE_WORDS = new Set(
  ['yes', 'y', 'true', '1', 'نعم', 'اه', 'ايوه', 'ايوا', 'صح', '✓', '✔'].map(
    normalizeLookupKey,
  ),
);
const FALSE_WORDS = new Set(
  ['no', 'n', 'false', '0', 'لا', 'لأ', 'خطأ', 'غلط', '✗', '✘'].map(
    normalizeLookupKey,
  ),
);

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Spreadsheet date text → YYYY-MM-DD when it reads as a date: ISO dates or
 * timestamps (what Excel date cells become), YYYY/M/D, and day-first
 * D/M/YYYY, D-M-YYYY or D.M.YYYY (the local convention). Anything else is
 * passed on unchanged and rejected by value validation.
 */
export function parseImportedDate(value: string): string {
  const text = toLatinDigits(value).trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const yearFirst = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/.exec(text);
  if (yearFirst) {
    return `${yearFirst[1]}-${pad(Number(yearFirst[2]))}-${pad(Number(yearFirst[3]))}`;
  }

  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (dayFirst) {
    return `${dayFirst[3]}-${pad(Number(dayFirst[2]))}-${pad(Number(dayFirst[1]))}`;
  }

  return text;
}

/** Cell option text → the option as defined (case / Arabic variants ignored). */
function matchOption(options: string[], value: string): string {
  const wanted = normalizeLookupKey(value);
  return (
    options.find((option) => normalizeLookupKey(option) === wanted) ?? value
  );
}

/**
 * One spreadsheet cell → the raw value handed to custom field validation.
 * Cleans up what people type (Arabic digits, "نعم", "www.site.com", option
 * spelling) but never guesses: unreadable values stay as they are and fail
 * validation, so the row is reported. Blank cells become '' (no value).
 */
export function importedCustomFieldValue(
  definition: Pick<CustomFieldDefinitionLike, 'type' | 'options'>,
  cell: string,
): unknown {
  const text = cell.replace(INVISIBLE_CHARS, '').trim();
  if (text.length === 0) return '';

  switch (definition.type) {
    case CustomFieldType.TEXT:
      // Over-long text is reported, not cut.
      return text.length > CUSTOM_FIELD_TEXT_MAX_LENGTH
        ? text
        : text.replace(/\s+/g, ' ');
    case CustomFieldType.NUMBER:
      return toLatinDigits(text).replace(/[\s,\u00A0]/g, '');
    case CustomFieldType.DATE:
      return parseImportedDate(text);
    case CustomFieldType.BOOLEAN: {
      const key = normalizeLookupKey(text);
      if (TRUE_WORDS.has(key)) return true;
      if (FALSE_WORDS.has(key)) return false;
      return text;
    }
    case CustomFieldType.URL:
      return /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(text) ? `https://${text}` : text;
    case CustomFieldType.SELECT:
      return matchOption(customFieldOptions(definition.options), text);
    case CustomFieldType.MULTI_SELECT: {
      const options = customFieldOptions(definition.options);
      // An option may itself contain a separator ("1/2 floor").
      const whole = matchOption(options, text);
      if (options.includes(whole)) return [whole];
      return splitImportedList(text).map((part) => matchOption(options, part));
    }
  }
}
