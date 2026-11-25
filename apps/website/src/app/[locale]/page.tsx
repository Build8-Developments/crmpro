import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { FIND_WORKSPACE_URL } from "@/config/site";
import { DemoSection } from "@/features/demo/components/demo-section";
import { FeatureGrid } from "@/features/home/components/feature-grid";
import { Hero } from "@/features/home/components/hero";
import { ProblemSection } from "@/features/home/components/problem-section";
import { ProductSection } from "@/features/home/components/product-section";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

/** Every "Book a demo" button scrolls to the form. */
const DEMO_HREF = "#demo";

/** Home: the "coming soon" landing page. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <>
      <SiteHeader locale={locale} dict={dict} demoHref={DEMO_HREF} signInHref={FIND_WORKSPACE_URL} overlay />
      <main id="main">
        <Hero copy={dict.hero} demoHref={DEMO_HREF} signInHref={FIND_WORKSPACE_URL} />
        <ProblemSection copy={dict.problem} />
        <ProductSection copy={dict.product} />
        <FeatureGrid copy={dict.features} />
        <DemoSection copy={dict.demo} locale={locale} />
      </main>
      <SiteFooter locale={locale} dict={dict} signInHref={FIND_WORKSPACE_URL} />
    </>
  );
}
