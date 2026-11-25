import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, hasLocale, type Locale } from "@/i18n/config";

/**
 * Every page lives under `/{locale}`. A path without one (`/`, `/pricing`) is
 * redirected to the visitor's saved choice (cookie set by the language switch),
 * else their browser's Accept-Language, else English.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPrefix = LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (hasPrefix) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

function preferredLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;

  // "ar-EG,ar;q=0.9,en;q=0.8" → the highest-weighted supported language.
  const ranked = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...rest] = part.trim().split(";");
      const q = rest.find((p) => p.trim().startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  const match = ranked.find((entry) => hasLocale(entry.lang));
  return match ? (match.lang as Locale) : DEFAULT_LOCALE;
}

export const config = {
  // Skip Next internals and files with an extension (icons, robots.txt, sitemap.xml).
  matcher: ["/((?!_next/|.*\\.[^/]+$).*)"],
};
