"use client";
import { getHomeRoute } from "@/lib/home-route";

import { ProductLogo } from "@/components/brand/product-logo";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthSplash } from "@/features/auth/components/auth-splash";
import { LoginFlow } from "@/features/auth/components/login-flow";
import { useAuthStore } from "@/stores/auth-store";

export function LoginPageClient() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(getHomeRoute());
    }
  }, [router, status]);

  if (status === "bootstrapping") {
    return <AuthSplash />;
  }

  if (status === "authenticated") {
    return <AuthSplash message="Opening your workspace..." />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[400px] rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <ProductLogo className="text-2xl" />
        </div>

        <LoginFlow />
      </div>
    </div>
  );
}
