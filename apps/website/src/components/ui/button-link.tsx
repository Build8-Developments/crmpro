import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Call-to-action link styled as a button. The site has no forms yet, so every button navigates. */
const buttonLinkVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-lg border border-transparent font-display font-semibold tracking-[-0.01em] transition-colors duration-150 [html[lang=ar]_&]:tracking-normal [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border-border bg-transparent text-foreground hover:bg-card",
        inverse: "bg-[#00845b] text-white hover:bg-[#169c6e]",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-13 px-6.5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"a"> & VariantProps<typeof buttonLinkVariants>) {
  return <a className={cn(buttonLinkVariants({ variant, size }), className)} {...props} />;
}
