"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LogoSymbol } from "@/components/brand/logo";
import { hasLocale, type Locale } from "@/i18n/config";
import ar from "@/i18n/dictionaries/ar";
import en from "@/i18n/dictionaries/en";

/** not-found pages get no params as props, so the locale is read on the client. */
export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const locale: Locale = params.locale && hasLocale(params.locale) ? params.locale : "en";
  const copy = (locale === "ar" ? ar : en).notFound;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col justify-center px-4 sm:px-8 lg:px-12">
      <LogoSymbol className="h-12 text-primary" />
      <span className="eyebrow mt-10 text-muted-foreground">404</span>
      <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.02] font-semibold tracking-display">
        {copy.title}
      </h1>
      <p className="mt-5 text-muted-foreground">{copy.text}</p>
      <Link href={`/${locale}`} className="mt-8 self-start border-b border-border font-semibold hover:border-primary">
        {copy.back}
      </Link>
    </main>
  );
}
