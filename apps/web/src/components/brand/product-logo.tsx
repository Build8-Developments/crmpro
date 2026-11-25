import { BRAND_NAME, LOGO_SYMBOL, LOGO_WORDMARK } from "@crmpro/shared/brand";
import { cn } from "@/lib/utils";

/**
 * Nomow product brand: the single place the product logo is drawn.
 * Paths come from `@crmpro/shared/brand` (outlined from brand/nomow/kit/A/logo):
 * the stepped-arch symbol and the "nomow" wordmark (Alexandria SemiBold) with its
 * emerald first o. Never retype the wordmark in a font; use these components.
 * The browser tab icon lives in `src/app/icon.svg`.
 */
export const PRODUCT_NAME = BRAND_NAME;

const SYMBOL_PATH = LOGO_SYMBOL.path;
const WORDMARK_VIEWBOX = LOGO_WORDMARK.viewBox;
const WORDMARK_LETTERS_PATH = LOGO_WORDMARK.lettersPath;
const WORDMARK_DOT_PATH = LOGO_WORDMARK.dotPath;

/** The stepped-arch symbol on its own (favicon, avatar, small spaces). */
export function ProductMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="9 12 84 76"
      role="img"
      aria-label={PRODUCT_NAME}
      className={cn("h-8 w-auto shrink-0 fill-primary", className)}
    >
      <path d={SYMBOL_PATH} />
    </svg>
  );
}

/**
 * The "nomow" wordmark. Letters take the current text colour, the first o
 * stays emerald; `oneColor` paints it in the text colour too, and
 * `dotClassName` overrides the dot's fill (e.g. to colour it on hover).
 */
export function ProductWordmark({
  className,
  oneColor = false,
  dotClassName,
}: {
  className?: string;
  oneColor?: boolean;
  dotClassName?: string;
}) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      role="img"
      aria-label={PRODUCT_NAME}
      className={cn("h-5 w-auto shrink-0 fill-current", className)}
    >
      <path d={WORDMARK_LETTERS_PATH} />
      <path
        d={WORDMARK_DOT_PATH}
        className={dotClassName ?? (oneColor ? undefined : "fill-primary")}
      />
    </svg>
  );
}

/**
 * Symbol + wordmark lockup. Sized by font size: the wordmark is 1em tall and
 * the symbol spans cap height to baseline, as in the brand kit.
 */
export function ProductLogo({
  className,
  showName = true,
  oneColor = false,
}: {
  className?: string;
  showName?: boolean;
  oneColor?: boolean;
}) {
  return (
    <span
      className={cn("inline-flex items-end gap-[0.9em] text-xl text-foreground", className)}
      role="img"
      aria-label={PRODUCT_NAME}
    >
      <svg
        viewBox="9 12 84 76"
        aria-hidden="true"
        className={cn("h-[1.28em] w-auto shrink-0", oneColor ? "fill-current" : "fill-primary")}
      >
        <path d={SYMBOL_PATH} />
      </svg>
      {showName ? (
        <svg
          viewBox={WORDMARK_VIEWBOX}
          aria-hidden="true"
          className="h-[1em] w-auto shrink-0 fill-current"
        >
          <path d={WORDMARK_LETTERS_PATH} />
          <path d={WORDMARK_DOT_PATH} className={oneColor ? undefined : "fill-primary"} />
        </svg>
      ) : null}
    </span>
  );
}
