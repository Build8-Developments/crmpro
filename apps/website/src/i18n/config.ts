/**
 * Website locales. Every page lives under `/{locale}`; `src/proxy.ts` sends
 * locale-less paths to the visitor's saved or preferred locale.
 */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie set by the language switch; the proxy prefers it over Accept-Language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Open Graph locale tags. */
export const OG_LOCALES: Record<Locale, string> = {
  en: "en_US",
  ar: "ar_EG",
};
