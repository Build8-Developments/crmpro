"use client";

import { useEffect, useRef } from "react";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks";
import { useSupportUnreadCount } from "@/features/support/hooks";

export function useTabBadge() {
  const { data: notificationsCount = 0 } = useUnreadNotificationsCount();
  const { data: supportCount = 0 } = useSupportUnreadCount();

  const originalTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }

    const totalUnread = notificationsCount + supportCount;
    const baseTitle = originalTitleRef.current.replace(/^\(\d+\)\s*/, "");

    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }

    return () => {
      // We don't restore on unmount necessarily, as the tab badge should persist across navigation
      // unless unread becomes 0.
    };
  }, [notificationsCount, supportCount]);
}
