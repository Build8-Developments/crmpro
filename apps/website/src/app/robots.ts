import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

/** Only production is indexed; every other build (staging, local) asks crawlers to stay out. */
export default function robots(): MetadataRoute.Robots {
  const isProduction = SITE_URL === "https://nomow.app";
  return isProduction
    ? { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` }
    : { rules: { userAgent: "*", disallow: "/" } };
}
