import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * A browser-only value without a mount effect: the server snapshot is used for
 * SSR and hydration, the client snapshot afterwards.
 */
export function useClientValue<T>(getClient: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, getClient, () => serverValue);
}
