export function normalizeSearchInput(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().replace(/\s+/g, ' ');

  return trimmed.length > 0 ? trimmed : undefined;
}
