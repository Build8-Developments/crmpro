export function normalizeSearch(search?: string): string | undefined {
  if (search === undefined || search === null) {
    return undefined;
  }

  const normalized = search.trim().replace(/\s+/g, ' ').toLowerCase();

  return normalized.length > 0 ? normalized : undefined;
}

/** Trims and collapses whitespace for DTO input before validation. */
export function normalizeSearchInput(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().replace(/\s+/g, ' ');

  return trimmed.length > 0 ? trimmed : undefined;
}
