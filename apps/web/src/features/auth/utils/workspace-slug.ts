export const WORKSPACE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeWorkspaceSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function isValidWorkspaceSlug(slug: string): boolean {
  return WORKSPACE_SLUG_PATTERN.test(slug);
}
