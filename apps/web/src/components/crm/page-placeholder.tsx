import type { AppIcon } from "@/components/icons/app-icons";

/**
 * Temporary "Coming soon" placeholder used by Phase 1 route pages.
 * Validates routing, layout, permissions and navigation before real screens
 * are built. Replace per-module in later phases.
 */
export function PagePlaceholder({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  icon?: AppIcon;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-6" stroke={1.75} />
        </div>
      )}
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{subtitle}</p>
      )}
      <p className="mt-4 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
        Coming soon
      </p>
    </div>
  );
}
