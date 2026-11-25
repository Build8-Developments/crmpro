import Link from "next/link";
import { BRAND_NAME, BRAND_NAME_AR } from "@crmpro/shared/brand";
import { Logo } from "@/components/brand/logo";
import { CONTACT_EMAIL } from "@/config/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { LanguageLink } from "./language-link";
import { ThemeSwitch } from "./theme-switch";

export function SiteFooter({
  locale,
  dict,
  signInHref,
}: {
  locale: Locale;
  dict: Dictionary;
  signInHref: string;
}) {
  const otherLocale: Locale = locale === "ar" ? "en" : "ar";
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-12 lg:px-12">
        <div className="lg:col-span-5">
          <Link href={`/${locale}`} aria-label={dict.nav.home} className="text-foreground">
            <Logo className="text-xl" />
          </Link>
          <p className="mt-5 max-w-xs text-muted-foreground">{dict.footer.tagline}</p>
        </div>
        <nav className="flex flex-col gap-3 text-[15px] lg:col-span-3 lg:col-start-7">
          <a href="#product" className="text-muted-foreground hover:text-foreground">
            {dict.nav.product}
          </a>
          <a href="#features" className="text-muted-foreground hover:text-foreground">
            {dict.nav.features}
          </a>
          <a href="#demo" className="text-muted-foreground hover:text-foreground">
            {dict.nav.bookDemo}
          </a>
          {signInHref && (
            <a href={signInHref} className="text-muted-foreground hover:text-foreground">
              {dict.nav.signIn}
            </a>
          )}
        </nav>
        <div className="flex flex-col items-start gap-3 text-[15px] lg:col-span-3">
          <span className="eyebrow text-subtle-foreground">{dict.footer.contact}</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-primary" dir="ltr">
            {CONTACT_EMAIL}
          </a>
          <LanguageLink
            to={otherLocale}
            label={dict.nav.switchLanguageLabel}
            className="text-muted-foreground hover:text-foreground"
          >
            {dict.nav.switchLanguage}
          </LanguageLink>
          <span className="eyebrow mt-3 text-subtle-foreground">{dict.theme.group}</span>
          <ThemeSwitch labels={dict.theme} />
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-8 lg:px-12">
          <span className="eyebrow font-normal text-subtle-foreground">
            © {year} {locale === "ar" ? BRAND_NAME_AR : BRAND_NAME}. {dict.footer.rights}
          </span>
          <span className="eyebrow font-normal text-subtle-foreground" dir="ltr">
            nomow.app
          </span>
        </div>
      </div>
    </footer>
  );
}
