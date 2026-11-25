import { BRAND_NAME, LOGO_SYMBOL, LOGO_WORDMARK } from "@crmpro/shared/brand";
import { cn } from "@/lib/utils";

/**
 * Nomow logo for the website, drawn from the shared brand paths
 * (`@crmpro/shared/brand`). The lockup never mirrors: in Arabic pages it
 * stays symbol-first and Latin.
 */

/** The stepped-arch symbol on its own. Takes the current text colour. */
export function LogoSymbol({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={LOGO_SYMBOL.viewBox}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("h-8 w-auto shrink-0 fill-current", className)}
    >
      <path d={LOGO_SYMBOL.path} />
    </svg>
  );
}

/**
 * Symbol + wordmark lockup, sized by font size: the wordmark is 1em tall and the
 * symbol spans cap height to baseline, as in the brand kit.
 * - `default`: emerald symbol and dot, letters in the current colour.
 * - `onDark`: for photos and dark panels: light-emerald symbol and dot, white letters.
 * - `inverse`: everything in the current colour (one-colour use on emerald or navy).
 */
export function Logo({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "onDark" | "inverse";
}) {
  const accent = tone === "inverse" ? "fill-current" : tone === "onDark" ? "fill-[#36b987]" : "fill-primary";
  return (
    <span
      dir="ltr"
      role="img"
      aria-label={BRAND_NAME}
      className={cn("inline-flex items-end gap-[0.9em] text-2xl", tone === "onDark" && "text-white", className)}
    >
      <svg viewBox={LOGO_SYMBOL.viewBox} aria-hidden="true" className={cn("h-[1.28em] w-auto shrink-0", accent)}>
        <path d={LOGO_SYMBOL.path} />
      </svg>
      <svg viewBox={LOGO_WORDMARK.viewBox} aria-hidden="true" className="h-[1em] w-auto shrink-0 fill-current">
        <path d={LOGO_WORDMARK.lettersPath} />
        <path d={LOGO_WORDMARK.dotPath} className={accent} />
      </svg>
    </span>
  );
}

/**
 * The "nomow" wordmark alone, sized by font size (1em = the brand's x-height band), for
 * use inside a headline in place of the typed name. Letters take the current colour; the
 * first o stays emerald.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_WORDMARK.viewBox}
      role="img"
      aria-label={BRAND_NAME}
      className={cn("inline-block h-[0.74em] w-auto shrink-0 fill-current align-baseline", className)}
    >
      <path d={LOGO_WORDMARK.lettersPath} />
      <path d={LOGO_WORDMARK.dotPath} className="fill-primary" />
    </svg>
  );
}
