/**
 * Workspace addresses. Every workspace has its own host, built from one URL
 * template per environment:
 *
 *   production   https://{slug}.nomow.app          prime-estates-x7k2.nomow.app
 *   staging      https://{slug}-staging.nomow.app  prime-estates-x7k2-staging.nomow.app
 *   development  http://{slug}.localhost:3001      prime-estates.localhost:3001
 *
 * The slug is `<prefix>-<4 random characters>`, chosen once when the platform
 * admin creates the workspace, and never changes.
 */

export const WORKSPACE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const WORKSPACE_PREFIX_MAX_LENGTH = 30;
export const WORKSPACE_SUFFIX_LENGTH = 4;
/** No 0/o or 1/l, so the address can be read out over the phone. */
export const WORKSPACE_SUFFIX_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
/** DNS caps a host label at 63 characters. */
export const WORKSPACE_SLUG_MAX_LENGTH = 63;

/** Prefixes (and whole labels) that look like platform hosts. */
export const RESERVED_WORKSPACE_PREFIXES = [
  'admin',
  'api',
  'app',
  'auth',
  'demo',
  'docs',
  'help',
  'login',
  'mail',
  'nomow',
  'staging',
  'status',
  'support',
  'www',
] as const;

const RESERVED = new Set<string>(RESERVED_WORKSPACE_PREFIXES);

/** `<prefix>-<random suffix>`; `randomIndex(max)` returns 0 ≤ n < max. */
export function generateWorkspaceSlug(
  prefix: string,
  randomIndex: (max: number) => number,
): string {
  let suffix = '';
  for (let i = 0; i < WORKSPACE_SUFFIX_LENGTH; i += 1) {
    suffix +=
      WORKSPACE_SUFFIX_ALPHABET[randomIndex(WORKSPACE_SUFFIX_ALPHABET.length)];
  }
  return `${prefix}-${suffix}`;
}

/**
 * Could `value` be a workspace slug? Shape only: lowercase letters, digits
 * and single hyphens, short enough for a host label, and not a platform name
 * such as `admin` or `www`.
 */
export function isWorkspaceSlug(value: string): boolean {
  return (
    value.length <= WORKSPACE_SLUG_MAX_LENGTH &&
    WORKSPACE_SLUG_PATTERN.test(value) &&
    !RESERVED.has(value)
  );
}

export interface WorkspaceUrlTemplate {
  /** `https:` or `http:` */
  protocol: string;
  /** Host text before and after `{slug}`, port included: `""` and `.nomow.app`. */
  hostBefore: string;
  hostAfter: string;
}

const TEMPLATE_PATTERN = /^(https?:)\/\/([^/{}]*)\{slug\}([^/{}]*)\/?$/;

/** Validates and parses `https://{slug}.nomow.app`; null when malformed. */
export function parseWorkspaceUrlTemplate(
  template: string,
): WorkspaceUrlTemplate | null {
  const match = TEMPLATE_PATTERN.exec(template.trim().toLowerCase());
  if (!match) return null;
  const [, protocol, hostBefore, hostAfter] = match;
  // `{slug}` must be a whole label or the start of one: `{slug}.x` or `{slug}-staging.x`.
  if (hostBefore && !hostBefore.endsWith('.')) return null;
  if (!hostAfter.startsWith('.') && !/^-[a-z0-9-]*[a-z0-9]\./.test(hostAfter)) {
    return null;
  }
  return { protocol, hostBefore, hostAfter };
}

/** Absolute URL on a workspace's own host, e.g. `/login` → `https://acme-x7k2.nomow.app/login`. */
export function buildWorkspaceUrl(
  template: WorkspaceUrlTemplate,
  slug: string,
  path = '/',
): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${template.protocol}//${template.hostBefore}${slug}${template.hostAfter}${suffix}`;
}

/**
 * The workspace a host (`name[:port]`, as in `location.host`) belongs to, or
 * null when it is not a workspace host of this template (the apex, admin,
 * another environment, a look-alike domain).
 */
export function workspaceSlugFromHost(
  host: string,
  template: WorkspaceUrlTemplate,
): string | null {
  const value = host.trim().toLowerCase().replace(/\.(?=:|$)/, '');
  const { hostBefore, hostAfter } = template;
  if (!value.startsWith(hostBefore) || !value.endsWith(hostAfter)) return null;
  const slug = value.slice(hostBefore.length, value.length - hostAfter.length);
  return isWorkspaceSlug(slug) ? slug : null;
}

/** Same as `workspaceSlugFromHost`, for a full origin such as a request's `Origin` header. */
export function workspaceSlugFromOrigin(
  origin: string,
  template: WorkspaceUrlTemplate,
): string | null {
  const match = /^(https?:)\/\/([^/?#]+)\/?$/.exec(origin.trim().toLowerCase());
  if (!match || match[1] !== template.protocol) return null;
  return workspaceSlugFromHost(match[2], template);
}
