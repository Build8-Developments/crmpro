import { API_ERROR_CODES } from "@crmpro/shared/errors";
import { useAuthStore } from "@/stores/auth-store";

/** The API's code for a write refused because the workspace is read-only. */
export const TENANT_READ_ONLY_CODE = API_ERROR_CODES.TENANT_READ_ONLY;

const untilFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "12 Jan 2027" (access ends at the end of that UTC day), or null. */
export function formatReadOnlyUntil(
  accessEndsAt: string | null | undefined,
): string | null {
  if (!accessEndsAt) return null;
  const date = new Date(accessEndsAt);
  return Number.isNaN(date.getTime()) ? null : untilFormatter.format(date);
}

export function tenantReadOnlyMessage(
  accessEndsAt: string | null | undefined,
): string {
  const until = formatReadOnlyUntil(accessEndsAt);
  return `This workspace is read-only${until ? ` until ${until}` : ""} because its contract ended. You can still view and export your data.`;
}

/** accessEndsAt from a TENANT_READ_ONLY error's details, if present. */
export function readOnlyAccessEndsAt(details: unknown): string | null {
  if (details && typeof details === "object" && "accessEndsAt" in details) {
    const value = (details as { accessEndsAt: unknown }).accessEndsAt;
    return typeof value === "string" ? value : null;
  }
  return null;
}

/**
 * A write was refused as read-only: turn the banner on even if the session
 * started before the contract was terminated.
 */
export function markWorkspaceReadOnly(accessEndsAt: string | null): void {
  const { user, setUser } = useAuthStore.getState();
  if (!user || user.tenant.access?.readOnly) return;

  setUser({
    ...user,
    tenant: { ...user.tenant, access: { readOnly: true, accessEndsAt } },
  });
}
