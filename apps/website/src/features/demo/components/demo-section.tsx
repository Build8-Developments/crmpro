import { LogoSymbol } from "@/components/brand/logo";
import { Reveal } from "@/components/site/reveal";
import { RisingArcade } from "@/features/home/components/rising-arcade";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { DemoForm } from "./demo-form";

/** Twelve months, each a step above the last. */
const YEAR = [3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 12];

/** Navy band: the demo request form beside the rising arcade. Every "Book a demo" link points here. */
export function DemoSection({ copy, locale }: { copy: Dictionary["demo"]; locale: Locale }) {
  return (
    <section id="demo" className="relative isolate scroll-mt-20 overflow-hidden bg-navy text-navy-foreground">
      <LogoSymbol className="absolute -end-10 -top-16 -z-10 h-auto w-[360px] text-white/[0.035]" />
      <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-12 lg:gap-x-6 lg:px-12 lg:py-28">
        <Reveal className="flex flex-col lg:col-span-6">
          <span className="eyebrow text-navy-muted">
            <span className="flip-rtl inline-block">→</span> {copy.label}
          </span>
          <h2 className="mt-4 font-display text-[clamp(2.2rem,4.4vw,4rem)] leading-[1.02] font-semibold tracking-display text-balance [html[lang=ar]_&]:leading-[1.3]">
            {copy.title}
          </h2>
          <p className="mt-6 max-w-[30em] text-lg text-navy-muted">{copy.text}</p>
          <div aria-hidden="true" className="mt-14 hidden h-40 lg:mt-auto lg:block lg:h-48">
            <RisingArcade
              values={YEAR}
              className="gap-[2.5%]"
              archClassName="bg-white/[0.07]"
              highlightClassName="bg-[#00845b]"
            />
          </div>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-5 lg:col-start-8">
          <div className="rounded-2xl bg-card p-6 text-foreground shadow-frame sm:p-8">
            <DemoForm copy={copy.form} locale={locale} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
