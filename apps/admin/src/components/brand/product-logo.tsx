import { cn } from "@/lib/utils";

/**
 * Nomow product brand: the single place the product logo is drawn.
 * Paths are outlined from the brand kit (brand/nomow/kit/A/logo): the
 * stepped-arch symbol and the "nomow" wordmark (Alexandria SemiBold) with its
 * emerald first o. Never retype the wordmark in a font; use these components.
 * The browser tab icon lives in `src/app/icon.svg`.
 */
export const PRODUCT_NAME = "Nomow";

const SYMBOL_PATH =
  "M9 88L9 54C9 40.745 19.745 30 33 30C37.434 30 41.587 31.202 45.15 33.298C46.493 21.315 56.658 12 69 12C82.255 12 93 22.745 93 36L93 88L81 88L81 36C81 29.373 75.627 24 69 24C62.373 24 57 29.373 57 36L57 88L45 88L45 54C45 47.373 39.627 42 33 42C26.373 42 21 47.373 21 54L21 88Z";

const WORDMARK_VIEWBOX = "10.571 22.429 533.143 78.314";
const WORDMARK_LETTERS_PATH =
  "M244.857 58Q244.857 50.429 240.929 46.071Q237 41.714 230.143 41.714Q222.143 42 217.571 47.714Q213 53.429 213 62.143L213 100L191 100L191 23.286L213 23.286L213 36.571Q216.571 30.286 222.143 26.714Q229.286 22.429 239 22.429Q247.571 22.429 253.786 26.071Q260 29.714 263.286 36.286Q264.286 38 265 40L265 39.857Q268.857 31.143 275.929 26.786Q283 22.429 292.714 22.429Q301.286 22.429 307.5 26.071Q313.714 29.714 317.071 36.286Q320.429 42.857 320.429 51.857L320.429 100L298.571 100L298.571 58Q298.571 50.429 294.571 46.071Q290.571 41.714 283.714 41.714Q275.857 42 271.286 47.714Q266.714 53.429 266.714 62.143L266.714 100L244.857 100ZM410.571 23.286L433 23.286L450.143 79L466.714 23.286L488.286 23.286L505.143 79L522 23.286L543.714 23.286L515.714 100L493.714 100L477.286 48.286L460.714 100L438.714 100ZM371.286 22.571Q383.571 22.571 392.857 27.429Q402.143 32.286 407.286 41.071Q412.429 49.857 412.429 61.571Q412.429 73.286 407.286 82.143Q402.143 91 392.857 95.857Q383.571 100.714 371.286 100.714Q359 100.714 349.643 95.857Q340.286 91 335.143 82.143Q330 73.286 330 61.571Q330 49.857 335.143 41.071Q340.286 32.286 349.643 27.429Q359 22.571 371.286 22.571ZM65.286 58Q65.286 50.429 61.214 46.143Q57.143 41.857 50.143 41.857Q42 42 37.286 47.714Q33.143 52.571 32.571 59.857L32.571 100L10.571 100L10.571 23.286L32.571 23.286L32.571 36.571Q36.286 30.286 42 26.714Q49.286 22.429 59.143 22.429Q67.714 22.429 74.071 26.071Q80.429 29.714 83.857 36.286Q87.286 42.857 87.286 51.857L87.286 100L65.286 100ZM371.286 40.143Q365.571 40.143 361.214 42.857Q356.857 45.571 354.429 50.5Q352 55.429 352 61.857Q352 68.286 354.429 73.214Q356.857 78.143 361.214 80.929Q365.571 83.714 371.286 83.714Q377 83.714 381.286 80.929Q385.571 78.143 388 73.214Q390.429 68.286 390.429 61.857Q390.429 55.429 388 50.5Q385.571 45.571 381.286 42.857Q377 40.143 371.286 40.143Z";
const WORDMARK_DOT_PATH =
  "M96.821 61.643C96.821 40.049 115.289 22.543 138.071 22.543C160.853 22.543 179.321 40.049 179.321 61.643C179.321 83.237 160.853 100.743 138.071 100.743C115.289 100.743 96.821 83.237 96.821 61.643Z";

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
