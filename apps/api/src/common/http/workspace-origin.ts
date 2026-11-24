import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  parseWorkspaceUrlTemplate,
  workspaceSlugFromOrigin,
  type WorkspaceUrlTemplate,
} from '@crmpro/shared/workspaces';

/**
 * Workspace hosts, seen from the API. Every workspace is served on its own
 * host (WORKSPACE_URL_TEMPLATE, e.g. https://{slug}.nomow.app) and browsers
 * always send that host as `Origin` on sign-in and refresh calls. Page
 * scripts cannot change `Origin`, so it is what ties a browser session to the
 * workspace whose address is in the address bar.
 */

export function workspaceUrlTemplate(
  config: ConfigService,
): WorkspaceUrlTemplate | null {
  const raw = config.get<string | null>('workspaces.urlTemplate');
  return raw ? parseWorkspaceUrlTemplate(raw) : null;
}

/** The workspace whose host sent this request, or null (apex, a script, no template). */
export function requestWorkspaceSlug(
  headers: { origin?: string | string[] },
  template: WorkspaceUrlTemplate | null,
): string | null {
  const origin = Array.isArray(headers.origin)
    ? headers.origin[0]
    : headers.origin;
  if (!origin || !template) return null;
  return workspaceSlugFromOrigin(origin, template);
}

/**
 * Refuses a request sent from one workspace's host on behalf of another, e.g.
 * signing in to `acme` from `prime-estates-x7k2.nomow.app`. Requests from
 * the apex or from outside a browser (no workspace `Origin`) are not bound.
 */
export function assertRequestFromWorkspace(
  headers: { origin?: string | string[] },
  template: WorkspaceUrlTemplate | null,
  tenantSlug: string,
): void {
  const hostSlug = requestWorkspaceSlug(headers, template);
  if (hostSlug && hostSlug !== tenantSlug.trim().toLowerCase()) {
    throw new ForbiddenException(
      'This sign-in page belongs to another workspace',
    );
  }
}

/**
 * Origins the realtime socket accepts: the exact CORS_ORIGINS entries plus
 * every workspace host of this environment. Browsers always send `Origin` on
 * a WebSocket handshake; clients outside a browser send none and still need
 * a valid access token.
 */
export function isAllowedSocketOrigin(
  origin: string | undefined,
  exactOrigins: readonly string[],
  template: WorkspaceUrlTemplate | null,
): boolean {
  if (!origin) return true;
  if (exactOrigins.includes(origin)) return true;
  return template ? workspaceSlugFromOrigin(origin, template) !== null : false;
}
