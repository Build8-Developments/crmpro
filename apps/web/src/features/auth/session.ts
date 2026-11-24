import { authApi } from "@/features/auth/api";
import { currentWorkspaceSlug } from "@/lib/workspace-host";
import { useAuthStore } from "@/stores/auth-store";

/** A session that belongs to a different workspace than this page's host. */
export class WorkspaceMismatchError extends Error {
  constructor() {
    super("This session belongs to another workspace");
    this.name = "WorkspaceMismatchError";
  }
}

export async function hydrateAuthSession(): Promise<boolean> {
  const { accessToken } = await authApi.refresh();
  await loadSession(accessToken);
  return true;
}

export async function hydrateAuthAfterLogin(accessToken: string): Promise<void> {
  await loadSession(accessToken);
}

async function loadSession(accessToken: string): Promise<void> {
  const store = useAuthStore.getState();
  store.setAccessToken(accessToken);

  try {
    const [user, authorization] = await Promise.all([
      authApi.me(),
      authApi.permissions(),
    ]);

    // The API already binds sign-in and refresh to the host; this keeps a
    // page from ever showing one workspace's data under another's address.
    const hostSlug = currentWorkspaceSlug();
    if (hostSlug && user.tenant.slug !== hostSlug) {
      throw new WorkspaceMismatchError();
    }

    store.setUser(user);
    store.setPermissions(new Set(authorization.permissions));
    store.setStatus("authenticated");
  } catch (error) {
    store.clearAuth();
    throw error;
  }
}
