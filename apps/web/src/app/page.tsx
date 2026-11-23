"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthSplash } from "@/features/auth/components/auth-splash";
import { getHomeRoute } from "@/lib/home-route";
import { useAuthStore } from "@/stores/auth-store";

/** Root entry: Today for agents, the dashboard for managers. */
export default function RootPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "authenticated") router.replace(getHomeRoute());
    if (status === "unauthenticated") router.replace("/login");
  }, [router, status]);

  return <AuthSplash />;
}
