export function normalizeProjectNameForComparison(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeProjectDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
