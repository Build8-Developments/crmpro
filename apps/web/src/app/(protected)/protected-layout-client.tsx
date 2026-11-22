"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { findRouteByPath } from "@/config/routes";
import { AuthSplash } from "@/features/auth/components/auth-splash";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth-store";

export function ProtectedLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const { canAccessRoute } = usePermissions();

  // A typed URL must not bypass what the sidebar hides. Routes missing from the
  // config are not gated here; the API still enforces permissions on every call.
  const route =
    status === "authenticated" ? findRouteByPath(pathname) : undefined;
  const denied = route ? !canAccessRoute(route) : false;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (denied) {
      router.replace("/403");
    }
  }, [denied, router]);

  if (status === "bootstrapping") {
    return <AuthSplash />;
  }

  if (status === "unauthenticated") {
    return <AuthSplash message="Redirecting to sign in..." />;
  }

  if (denied) {
    return <AuthSplash message="Checking access..." />;
  }

  return <AppShell>{children}</AppShell>;
}
