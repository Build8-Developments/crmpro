import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/stores/auth-store";

export async function hydrateAuthSession(): Promise<boolean> {
  const store = useAuthStore.getState();

  const { accessToken } = await authApi.refresh();
  store.setAccessToken(accessToken);

  try {
    const [user, authorization] = await Promise.all([
      authApi.me(),
      authApi.permissions(),
    ]);

    store.setUser(user);
    store.setPermissions(new Set(authorization.permissions));
    store.setStatus("authenticated");
    return true;
  } catch (error) {
    store.clearAuth();
    throw error;
  }
}

export async function hydrateAuthAfterLogin(accessToken: string): Promise<void> {
  const store = useAuthStore.getState();
  store.setAccessToken(accessToken);

  try {
    const [user, authorization] = await Promise.all([
      authApi.me(),
      authApi.permissions(),
    ]);

    store.setUser(user);
    store.setPermissions(new Set(authorization.permissions));
    store.setStatus("authenticated");
  } catch (error) {
    store.clearAuth();
    throw error;
  }
}
