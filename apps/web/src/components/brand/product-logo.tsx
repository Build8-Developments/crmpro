import { cn } from "@/lib/utils";

/**
 * CRMPro product brand — the single place the product logo is drawn.
 *
 * Placeholder until the real brand exists: swap the <svg> (or render an
 * <img src="/brand/logo.svg">) here and every surface updates — sign-in page,
 * loading splash, sidebar "Powered by" footer. The browser tab icon lives in
 * `src/app/icon.svg`; replace it alongside.
 */
export const PRODUCT_NAME = "CRMPro";

export function ProductMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={PRODUCT_NAME}
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M20.5 11.2a6.5 6.5 0 1 0 0 9.6"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
    </svg>
  );
}

export function ProductLogo({
  className,
  markClassName,
  showName = true,
}: {
  className?: string;
  markClassName?: string;
  showName?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <ProductMark className={markClassName} />
      {showName ? (
        <span className="font-semibold tracking-tight text-foreground">
          {PRODUCT_NAME}
        </span>
      ) : null}
    </span>
  );
}
