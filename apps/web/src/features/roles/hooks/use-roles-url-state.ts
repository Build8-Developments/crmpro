"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface UseRolesUrlStateOptions {
  selectedRoleId: string | null;
  setSelectedRoleId: (roleId: string | null) => void;
}

export function useRolesUrlState({
  selectedRoleId,
  setSelectedRoleId,
}: UseRolesUrlStateOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = searchParams.toString();
    if (!signature || appliedRef.current === signature) {
      return;
    }

    const roleId = searchParams.get("roleId");
    if (roleId) {
      setSelectedRoleId(roleId);
    }

    appliedRef.current = signature;
  }, [searchParams, setSelectedRoleId]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedRoleId) {
      params.set("roleId", selectedRoleId);
    } else {
      params.delete("roleId");
    }

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, router, searchParams, selectedRoleId]);
}
