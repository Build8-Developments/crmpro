"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthSplash } from "@/features/auth/components/auth-splash";
import { useAuthStore } from "@/stores/auth-store";

export function ProtectedLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "bootstrapping") {
    return <AuthSplash />;
  }

  if (status === "unauthenticated") {
    return <AuthSplash message="Redirecting to sign in..." />;
  }

  return <AppShell>{children}</AppShell>;
}
