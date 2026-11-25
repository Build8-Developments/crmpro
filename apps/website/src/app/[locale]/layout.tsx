import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Alan_Sans, Alexandria } from "next/font/google";
import { BRAND_NAME } from "@crmpro/shared/brand";
import { SITE_URL } from "@/config/site";
import { LOCALES, OG_LOCALES, hasLocale, localeDirection } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "../globals.css";

/** Same brand fonts as apps/web: Alexandria (display, and all Arabic) + Alan Sans (Latin text). */
const displayFont = Alexandria({
  subsets: ["latin", "arabic"],
  variable: "--font-alexandria",
  display: "swap",
});

const textFont = Alan_Sans({
  subsets: ["latin"],
  variable: "--font-alan-sans",
  display: "swap",
});

/**
 * Runs before React: marks JS as running (reveal-on-scroll may then hide content
 * until shown) and applies the saved theme without a flash. See theme-switch.tsx.
 */
const initScript = `(() => {
  const root = document.documentElement;
  root.classList.add("js");
  let mode = "system";
  try { mode = localStorage.getItem("${THEME_STORAGE_KEY}") || "system"; } catch {}
  const dark = mode === "dark" || (mode !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
})();`;

type LocaleParams = { params: Promise<{ locale: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: dict.meta.title,
    description: dict.meta.description,
    applicationName: BRAND_NAME,
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", ar: "/ar", "x-default": "/en" },
    },
    openGraph: {
      type: "website",
      siteName: BRAND_NAME,
      title: dict.meta.title,
      description: dict.meta.description,
      url: `/${locale}`,
      locale: OG_LOCALES[locale],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({ children, params }: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      className={`${displayFont.variable} ${textFont.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <Script id="init" strategy="beforeInteractive">
          {initScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
