"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrivacyState {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyState>({ hidden: false, toggle: () => {} });

/** Revealed numbers hide again after this long without mouse, keyboard or scroll. */
const IDLE_HIDE_MS = 60_000;
const ACTIVITY_EVENTS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Performance numbers start hidden (My performance, Today's targets), so someone passing by a screen
 * doesn't see them. "Show numbers" reveals them until the user hides them
 * again, leaves the tab, or stops using the page for a minute (a laptop left
 * open on this page).
 */
export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const hideWhenAway = () => {
      if (document.visibilityState === "hidden") setHidden(true);
    };
    document.addEventListener("visibilitychange", hideWhenAway);
    return () => document.removeEventListener("visibilitychange", hideWhenAway);
  }, []);

  // While revealed: hide again after a minute of inactivity.
  useEffect(() => {
    if (hidden) return;
    let timer = setTimeout(() => setHidden(true), IDLE_HIDE_MS);
    const onActivity = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setHidden(true), IDLE_HIDE_MS);
    };
    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { passive: true, capture: true });
    }
    return () => {
      clearTimeout(timer);
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, onActivity, { capture: true });
      }
    };
  }, [hidden]);

  const toggle = useCallback(() => setHidden((value) => !value), []);
  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyState {
  return useContext(PrivacyContext);
}

/**
 * The toggle: "Show numbers" / "Hide numbers". `compact` is an icon-only
 * button for card headers (the label stays for screen readers).
 */
export function PrivacyToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { hidden, toggle } = usePrivacy();
  const Icon = hidden ? AppIcons.eye : AppIcons.eyeOff;
  const label = hidden ? "Show numbers" : "Hide numbers";
  if (compact) {
    return (
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className={cn("text-muted-foreground", className)}
        aria-pressed={!hidden}
        aria-label={label}
        title={label}
        onClick={toggle}
      >
        <Icon className="size-3.5" />
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size="sm"
      variant={hidden ? "default" : "outline"}
      className={cn("gap-1.5", className)}
      aria-pressed={!hidden}
      onClick={toggle}
    >
      <Icon className="size-4" />
      {label}
    </Button>
  );
}

/** One value inline: "•••" while numbers are hidden. */
export function PrivateText({ children }: { children: React.ReactNode }) {
  const { hidden } = usePrivacy();
  if (!hidden) return <>{children}</>;
  return (
    <span aria-label="Hidden" className="tracking-widest select-none">
      •••
    </span>
  );
}

/**
 * Blurs its content while numbers are hidden. The content stays in place so
 * the layout doesn't jump, but it is unreadable, unselectable and hidden
 * from screen readers until revealed.
 */
export function PrivateBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const { hidden } = usePrivacy();
  if (!hidden) return <div className={className}>{children}</div>;
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="pointer-events-none blur-md select-none" inert>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-[11px] text-muted-foreground shadow-xs">
          <AppIcons.eyeOff className="size-3.5" />
          Hidden
        </span>
      </div>
    </div>
  );
}
