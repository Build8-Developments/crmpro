export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export function isValidPassword(password: string): boolean {
  return PASSWORD_PATTERN.test(password);
}

export const PASSWORD_HINT =
  "8–128 characters with uppercase, lowercase, and a number.";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return (
    slug.length >= 2 &&
    slug.length <= WORKSPACE_PREFIX_MAX_LENGTH &&
    SLUG_PATTERN.test(slug) &&
    !RESERVED_PREFIXES.has(slug)
  );
}

export const SLUG_HINT =
  "Lowercase letters, numbers and single hyphens. 4 random characters are added, so the address can't be guessed.";

/** Must match the admin API (WORKSPACE_PREFIX_MAX_LENGTH, reserved prefixes). */
export const WORKSPACE_PREFIX_MAX_LENGTH = 30;
const RESERVED_PREFIXES = new Set([
  "admin", "api", "app", "auth", "docs", "help", "login", "mail",
  "nomow", "staging", "status", "support", "www",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_PREFIXES.has(slug);
}

export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, WORKSPACE_PREFIX_MAX_LENGTH)
    .replace(/-+$/g, "");
}
