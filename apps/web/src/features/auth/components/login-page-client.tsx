"use client";

import { PRODUCT_NAME, ProductMark } from "@/components/brand/product-logo";
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
      router.replace("/dashboard");
    }
  }, [router, status]);

  if (status === "bootstrapping") {
    return <AuthSplash />;
  }

  if (status === "authenticated") {
    return <AuthSplash message="Opening dashboard..." />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[400px] rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <ProductMark className="size-10" />
          <div>
            <span className="text-lg font-semibold tracking-tight">{PRODUCT_NAME}</span>
            <p className="text-xs text-muted-foreground">Sign in to your workspace</p>
          </div>
        </div>

        <LoginFlow />
      </div>
    </div>
  );
}
