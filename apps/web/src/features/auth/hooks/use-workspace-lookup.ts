"use client";

import { useEffect, useState } from "react";
import { authApi } from "@/features/auth/api";
import {
  isValidWorkspaceSlug,
  normalizeWorkspaceSlug,
} from "@/features/auth/utils/workspace-slug";
import { ApiError } from "@/lib/api/client";
import type { WorkspaceLookupResult } from "@/types/auth";

export type WorkspaceLookupStatus =
  | "idle"
  | "typing"
  | "checking"
  | "exists"
  | "missing"
  | "error";

const DEBOUNCE_MS = 500;

export function useWorkspaceLookup(rawSlug: string) {
  const slug = normalizeWorkspaceSlug(rawSlug);
  const [status, setStatus] = useState<WorkspaceLookupStatus>("idle");
  const [workspace, setWorkspace] = useState<WorkspaceLookupResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setErrorMessage(null);

    if (!slug) {
      setStatus("idle");
      setWorkspace(null);
      return;
    }

    if (slug.length < 2) {
      setStatus("typing");
      setWorkspace(null);
      return;
    }

    if (!isValidWorkspaceSlug(slug)) {
      setStatus("typing");
      setWorkspace(null);
      return;
    }

    setStatus("checking");
    setWorkspace(null);

    const timer = window.setTimeout(async () => {
      try {
        const result = await authApi.lookupWorkspace(slug);
        setWorkspace(result);
        setStatus("exists");
      } catch (error) {
        setWorkspace(null);
        if (error instanceof ApiError && error.status === 404) {
          setStatus("missing");
          return;
        }

        setStatus("error");
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Unable to verify workspace. Try again.",
        );
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [slug]);

  return {
    slug,
    status,
    workspace,
    errorMessage,
  };
}
