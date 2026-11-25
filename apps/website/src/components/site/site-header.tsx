"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { IconArrowRight, IconLanguage, IconMenu2, IconX } from "@tabler/icons-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";
import { LanguageLink } from "./language-link";
import { ThemeSwitch } from "./theme-switch";

/** In-page sections the header links to and highlights while they are on screen. */
const SECTIONS = ["product", "features", "demo"] as const;
type Section = (typeof SECTIONS)[number];

/**
 * Floating header: a rounded bar that sits a little below the top of the screen
 * and stays there. The link of the section being read is highlighted. On small
 * screens the links, theme and language move into a menu.
 *
 * `overlay`: the page opens on a full-screen photo. Over it the bar is
 * transparent with white text; it turns into the solid white bar once the photo
 * has scrolled away (or the menu opens).
 */
export function SiteHeader({
  locale,
  dict,
  demoHref,
  signInHref,
  overlay = false,
}: {
  locale: Locale;
  dict: Pick<Dictionary, "nav" | "theme">;
  demoHref: string;
  /** Empty: no "Sign in" link. */
  signInHref: string;
  overlay?: boolean;
}) {
  const { nav } = dict;
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<Section | null>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const otherLocale: Locale = locale === "ar" ? "en" : "ar";

  useEffect(() => {
    // Over a photo, stay transparent until the photo has (nearly) scrolled away.
    const onScroll = () => setScrolled(window.scrollY > (overlay ? window.innerHeight * 0.7 : 8));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  // Highlight the section that crosses the middle of the screen.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as Section);
          else setActive((current) => (current === entry.target.id ? null : current));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const id of SECTIONS) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const clear = overlay && !scrolled && !open;

  const links: { href: string; label: string; section?: Section }[] = [
    { href: "#product", label: nav.product, section: "product" },
    { href: "#features", label: nav.features, section: "features" },
    ...(signInHref ? [{ href: signInHref, label: nav.signIn }] : []),
  ];

  return (
    <header className={cn("sticky top-0 z-40 px-3 pt-3 sm:px-6 lg:px-12", overlay && "hero-drop-in")}>
      <a
        href="#main"
        className="sr-only rounded-md bg-card px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50"
      >
        {nav.skip}
      </a>

      <div
        className={cn(
          "mx-auto flex h-14 max-w-[1344px] items-center gap-3 rounded-2xl border ps-4 pe-2 transition-[background-color,box-shadow,border-color] duration-300 sm:h-15 sm:ps-5",
          clear
            ? "border-white/20 bg-white/[0.07]"
            : scrolled || open
              ? "border-border bg-card shadow-card"
              : "border-line bg-card shadow-[0_1px_2px_rgb(15_23_42/0.04)]",
        )}
      >
        <Link href={`/${locale}`} aria-label={nav.home} className="shrink-0 text-foreground" onClick={() => setOpen(false)}>
          <Logo tone={clear ? "onDark" : "default"} className="text-[18px] sm:text-[20px]" />
        </Link>

        <nav className="ms-6 hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const current = link.section !== undefined && active === link.section;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "relative rounded-lg px-3.5 py-2 text-[15px] transition-colors",
                  clear
                    ? current
                      ? "text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                    : current
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3.5 -bottom-[9px] h-0.5 rounded-full bg-primary transition-opacity sm:-bottom-[11px]",
                    current ? "opacity-100" : "opacity-0",
                  )}
                />
              </a>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          <ThemeSwitch
            labels={dict.theme}
            className={cn(
              "hidden border-transparent md:inline-flex",
              clear
                ? "bg-white/10 [&_[aria-checked=true]]:!bg-white/20 [&_[aria-checked=true]]:!text-white [&_button]:!text-white/70"
                : "bg-muted/60",
            )}
          />
          <LanguageLink
            to={otherLocale}
            label={nav.switchLanguageLabel}
            className={cn(
              "hidden h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors md:inline-flex",
              clear ? "text-white/85 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <IconLanguage className="size-4" />
            {nav.switchLanguage}
          </LanguageLink>
          <ButtonLink href={demoHref} size="sm" className="hidden rounded-xl sm:inline-flex">
            {nav.bookDemo}
            <IconArrowRight className="flip-rtl" />
          </ButtonLink>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? nav.closeMenu : nav.menu}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "grid size-10 place-items-center rounded-xl transition-colors lg:hidden",
              clear ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted",
            )}
          >
            {open ? <IconX className="size-5" /> : <IconMenu2 className="size-5" />}
          </button>
        </div>
      </div>

      {/* Small screens: links, theme and language in a panel under the bar. */}
      <div
        id={menuId}
        hidden={!open}
        className="mx-auto mt-2 max-w-[1344px] rounded-2xl border border-border bg-card p-2 shadow-card lg:hidden"
      >
        <nav className="grid">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3.5 font-display text-lg font-semibold transition-colors hover:bg-muted"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-line px-2 pt-4 pb-2">
          <ThemeSwitch labels={dict.theme} />
          <LanguageLink
            to={otherLocale}
            label={nav.switchLanguageLabel}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold"
          >
            <IconLanguage className="size-4" />
            {nav.switchLanguage}
          </LanguageLink>
        </div>
        <ButtonLink href={demoHref} size="md" className="mt-2 w-full rounded-xl" onClick={() => setOpen(false)}>
          {nav.bookDemo}
          <IconArrowRight className="flip-rtl" />
        </ButtonLink>
      </div>
    </header>
  );
}
