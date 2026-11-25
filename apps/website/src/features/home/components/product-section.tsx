import { Wordmark } from "@/components/brand/logo";
import { BrowserFrame, ProductShot, isProductShotName } from "@/components/site/product-shot";
import { Reveal } from "@/components/site/reveal";
import type { Dictionary } from "@/i18n/get-dictionary";
import { ProductPreview } from "./product-preview";

/** "This is Nomow": the real app, one tab per screen. */
export function ProductSection({ copy }: { copy: Dictionary["product"] }) {
  const panels = Object.fromEntries(
    copy.tabs.map((tab) => [
      tab.key,
      isProductShotName(tab.key) ? (
        <BrowserFrame>
          <ProductShot name={tab.key} alt={tab.alt} sizes="(min-width: 1440px) 1340px, 95vw" />
        </BrowserFrame>
      ) : null,
    ]),
  );

  return (
    <section id="product" className="border-t border-line bg-card/60">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
        <Reveal className="grid gap-6 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-7">
            <span className="eyebrow text-muted-foreground">
              <span className="flip-rtl inline-block">→</span> {copy.label}
            </span>
            <h2 className="mt-4 font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-[1] font-semibold tracking-display [html[lang=ar]_&]:leading-[1.3]">
              <TitleWithWordmark title={copy.title} />
            </h2>
          </div>
          <p className="self-end text-muted-foreground lg:col-span-4 lg:col-start-9 lg:text-end">
            <span className="eyebrow me-2 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
              {copy.sample}
            </span>
            {copy.lede}
          </p>
        </Reveal>
        <Reveal delay={120} className="mt-12">
          <ProductPreview tabs={copy.tabs} label={copy.label} panels={panels} />
        </Reveal>
      </div>
    </section>
  );
}

/** "This is {brand}." with the real wordmark where `{brand}` is. The wordmark stays Latin and LTR. */
function TitleWithWordmark({ title }: { title: string }) {
  const [before, after = ""] = title.split("{brand}");
  return (
    <>
      {before}
      <span dir="ltr" className="inline-block whitespace-nowrap">
        <Wordmark className="translate-y-[0.02em]" />
      </span>
      {after}
    </>
  );
}
