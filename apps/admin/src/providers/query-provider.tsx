"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createQueryClient,
  setQueryClient,
} from "@/lib/query/query-client";

export { getQueryClient } from "@/lib/query/query-client";

/**
 * Provides the TanStack Query client for all server-state.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = createQueryClient();
    setQueryClient(client);
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
