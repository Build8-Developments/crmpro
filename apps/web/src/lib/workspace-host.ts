import {
  buildWorkspaceUrl,
  parseWorkspaceUrlTemplate,
  workspaceSlugFromHost,
} from "@crmpro/shared";

/**
 * Workspace hosts: every agency has its own address, e.g.
 * `prime-estates-x7k2.nomow.app`, and the host carries the workspace's slug.
 * The apex ("find my workspace") is where people land without one.
 *
 * NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE  each workspace's address, with `{slug}`:
 *   production  https://{slug}.nomow.app
 *   staging     https://{slug}-staging.nomow.app
 *   development http://{slug}.localhost:3001 (*.localhost resolves to this machine)
 * NEXT_PUBLIC_APEX_URL  the "find my workspace" page: https://nomow.app,
 *   https://staging.nomow.app, http://localhost:3001.
 *
 * Both must match the API's WORKSPACE_URL_TEMPLATE for the environment.
 */
const TEMPLATE_SOURCE =
  process.env.NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE || "http://{slug}.localhost:3001";
const APEX_URL = (process.env.NEXT_PUBLIC_APEX_URL || "http://localhost:3001").replace(/\/+$/, "");

const TEMPLATE = parseWorkspaceUrlTemplate(TEMPLATE_SOURCE);
if (!TEMPLATE) {
  throw new Error(
    `NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE must look like https://{slug}.example.com, got "${TEMPLATE_SOURCE}"`,
  );
}
const WORKSPACE_TEMPLATE = TEMPLATE;

/** The workspace a host (`name[:port]`) belongs to, or null for the apex / any other host. */
export function workspaceSlugFromLocationHost(host: string): string | null {
  return workspaceSlugFromHost(host, WORKSPACE_TEMPLATE);
}

/** The workspace this page is served for, or null on the apex (browser only). */
export function currentWorkspaceSlug(): string | null {
  if (typeof window === "undefined") return null;
  return workspaceSlugFromLocationHost(window.location.host);
}

/** Absolute URL on a workspace's own host. */
export function workspaceUrl(slug: string, path = "/"): string {
  return buildWorkspaceUrl(WORKSPACE_TEMPLATE, slug, path);
}

/** Absolute URL on the apex, where people find their workspace. */
export function apexUrl(path = "/"): string {
  return `${APEX_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** A link to sign in to `slug`: relative when already on its host. */
export function workspaceLoginHref(slug: string): string {
  return currentWorkspaceSlug() === slug ? "/login" : workspaceUrl(slug, "/login");
}
