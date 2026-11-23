import { CUSTOM_FIELD_KEY_MAX_LENGTH } from './custom-fields.constants';

/**
 * Label → lower_snake_case key ("Unit type" → "unit_type"). Accents are
 * dropped; a label with no Latin letters (e.g. Arabic) becomes "field".
 * Always matches CUSTOM_FIELD_KEY_PATTERN.
 */
export function slugifyCustomFieldKey(label: string): string {
  let slug = label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (slug.length === 0) slug = 'field';
  if (!/^[a-z]/.test(slug)) slug = `field_${slug}`;

  return slug.slice(0, CUSTOM_FIELD_KEY_MAX_LENGTH).replace(/_+$/, '');
}

/**
 * A key for the label that is not in `taken` ("unit_type", "unit_type_2",
 * …). Keys of archived fields count as taken: their values are still stored.
 */
export function deriveUniqueCustomFieldKey(
  label: string,
  taken: ReadonlySet<string>,
): string {
  const base = slugifyCustomFieldKey(label);
  if (!taken.has(base)) return base;

  for (let suffix = 2; ; suffix += 1) {
    const tail = `_${suffix}`;
    const candidate = `${base
      .slice(0, CUSTOM_FIELD_KEY_MAX_LENGTH - tail.length)
      .replace(/_+$/, '')}${tail}`;
    if (!taken.has(candidate)) return candidate;
  }
}
