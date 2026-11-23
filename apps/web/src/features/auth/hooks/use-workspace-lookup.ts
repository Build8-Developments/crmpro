"use client";

import { useEffect, useState } from "react";
import { authApi } from "@/features/auth/api";
import { authToast } from "@/features/auth/utils/auth-toast";
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

interface LookupOutcome {
  slug: string;
  status: "exists" | "missing" | "error";
  workspace: WorkspaceLookupResult | null;
}

export function useWorkspaceLookup(rawSlug: string) {
  const slug = normalizeWorkspaceSlug(rawSlug);
  const checkable = slug.length >= 2 && isValidWorkspaceSlug(slug);
  // Only the async answer is state; everything else derives from the slug, so
  // a stale answer for a previous slug is simply ignored.
  const [outcome, setOutcome] = useState<LookupOutcome | null>(null);

  useEffect(() => {
    authToast.dismissWorkspace();
    if (!checkable) return;

    const timer = window.setTimeout(async () => {
      try {
        const result = await authApi.lookupWorkspace(slug);
        setOutcome({ slug, status: "exists", workspace: result });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setOutcome({ slug, status: "missing", workspace: null });
          authToast.workspaceNotFound();
          return;
        }

        setOutcome({ slug, status: "error", workspace: null });
        authToast.workspaceLookupFailed(
          error instanceof ApiError
            ? error.message
            : "Unable to verify workspace. Try again.",
        );
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [slug, checkable]);

  const current = outcome?.slug === slug ? outcome : null;
  const status: WorkspaceLookupStatus = !slug
    ? "idle"
    : !checkable
      ? "typing"
      : (current?.status ?? "checking");

  return {
    slug,
    status,
    workspace: current?.workspace ?? null,
  };
}
