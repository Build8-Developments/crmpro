export function normalizeRoleNameForComparison(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
