"use client";

import type { ReactNode } from "react";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Switches to the other locale and remembers the choice for `/` (read by src/proxy.ts).
 * A full page load on purpose: <html lang> and dir change with the locale.
 */
export function LanguageLink({
  to,
  label,
  className,
  children,
}: {
  to: Locale;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`/${to}`}
      hrefLang={to}
      lang={to}
      aria-label={label}
      className={cn(to === "ar" && "font-display", className)}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax`;
      }}
    >
      {children}
    </a>
  );
}
