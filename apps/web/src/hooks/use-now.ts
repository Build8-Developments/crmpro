"use client";

import { useEffect, useState } from "react";

/**
 * The current time as state, refreshed every `intervalMs`. Keeps render pure
 * (no Date.now() in render) while relative labels like "5m overdue" stay live.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
