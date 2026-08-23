"use client";

import { useEffect, useRef } from "react";
import { useAdminSupportSummary } from "@/features/support/hooks";

export function useTabBadge() {
  const { data: summary } = useAdminSupportSummary();
  const supportCount = summary?.unread ?? 0;

  const originalTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }

    const totalUnread = supportCount;
    const baseTitle = originalTitleRef.current.replace(/^\(\d+\)\s*/, "");

    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [supportCount]);
}
