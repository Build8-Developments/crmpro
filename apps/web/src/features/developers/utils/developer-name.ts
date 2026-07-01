export function normalizeDeveloperNameForComparison(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeDeveloperDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
