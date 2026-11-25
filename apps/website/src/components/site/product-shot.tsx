import Image, { type StaticImageData } from "next/image";
import attentionDark from "@/assets/product/dark/crop-attention.jpg";
import viewsDark from "@/assets/product/dark/crop-lead-views.jpg";
import performanceDark from "@/assets/product/dark/crop-performance.jpg";
import nextDark from "@/assets/product/dark/crop-today-next.jpg";
import dashboardDark from "@/assets/product/dark/dashboard.jpg";
import dealsDark from "@/assets/product/dark/deals.jpg";
import leadsDark from "@/assets/product/dark/leads.jpg";
import targetsDark from "@/assets/product/dark/targets.jpg";
import todayDark from "@/assets/product/dark/today.jpg";
import attentionLight from "@/assets/product/light/crop-attention.jpg";
import viewsLight from "@/assets/product/light/crop-lead-views.jpg";
import performanceLight from "@/assets/product/light/crop-performance.jpg";
import nextLight from "@/assets/product/light/crop-today-next.jpg";
import dashboardLight from "@/assets/product/light/dashboard.jpg";
import dealsLight from "@/assets/product/light/deals.jpg";
import leadsLight from "@/assets/product/light/leads.jpg";
import targetsLight from "@/assets/product/light/targets.jpg";
import todayLight from "@/assets/product/light/today.jpg";
import { cn } from "@/lib/utils";

/**
 * Real screenshots of the CRM (sample data), captured by
 * `pnpm --filter website capture` (scripts/capture-screenshots.mjs). Each has a
 * light and a dark capture; the one matching the site's theme is shown.
 */
const SHOTS = {
  today: { light: todayLight, dark: todayDark },
  dashboard: { light: dashboardLight, dark: dashboardDark },
  leads: { light: leadsLight, dark: leadsDark },
  deals: { light: dealsLight, dark: dealsDark },
  targets: { light: targetsLight, dark: targetsDark },
  next: { light: nextLight, dark: nextDark },
  attention: { light: attentionLight, dark: attentionDark },
  performance: { light: performanceLight, dark: performanceDark },
  views: { light: viewsLight, dark: viewsDark },
} satisfies Record<string, { light: StaticImageData; dark: StaticImageData }>;

export type ProductShotName = keyof typeof SHOTS;

export function isProductShotName(value: string): value is ProductShotName {
  return value in SHOTS;
}

export function ProductShot({
  name,
  alt,
  sizes,
  priority = false,
  className,
}: {
  name: ProductShotName;
  alt: string;
  /** Rendered width, for responsive image sizes (e.g. "(min-width: 1024px) 60vw, 100vw"). */
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const shot = SHOTS[name];
  const common = { sizes, quality: 85, placeholder: "blur" as const };
  return (
    <>
      <Image
        src={shot.light}
        alt={alt}
        {...common}
        priority={priority}
        className={cn("block h-auto w-full dark:hidden", className)}
      />
      {/* Same picture in the dark theme; only one of the two is displayed, so only the light one is
          preloaded (a preload of the hidden one would be wasted). */}
      <Image
        src={shot.dark}
        alt={alt}
        {...common}
        loading={priority ? "eager" : "lazy"}
        className={cn("hidden h-auto w-full dark:block", className)}
      />
    </>
  );
}

/** A minimal browser window around a screenshot, on a workspace host. */
export function BrowserFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-frame", className)}>
      <div className="flex items-center gap-3 border-b border-line bg-muted/50 px-3 py-2" dir="ltr" aria-hidden="true">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div className="mx-auto h-6 w-full max-w-xs truncate rounded-md bg-card px-3 text-center text-[11px] leading-6 text-muted-foreground">
          prime-estates.nomow.app
        </div>
        <span className="w-[42px]" />
      </div>
      {children}
    </div>
  );
}
