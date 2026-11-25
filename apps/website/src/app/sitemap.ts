import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { LOCALES } from "@/i18n/config";

/** One entry per page and locale, each listing its translations. */
const PAGES = [""];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${page}`,
      changeFrequency: "monthly" as const,
      priority: page === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((other) => [other, `${SITE_URL}/${other}${page}`])),
      },
    })),
  );
}
