import type { ReactNode } from "react";
import type { AppIcon } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";

interface DashboardSectionCardProps {
  icon: AppIcon;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  contentClassName?: string;
}

export function DashboardSectionCard({
  icon: Icon,
  title,
  subtitle,
  badges,
  children,
  className,
  style,
  contentClassName,
}: DashboardSectionCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
      style={style}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-3.5" stroke={1.75} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {title}
            </h3>
            {subtitle ? (
              <p className="truncate text-[11px] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {badges ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {badges}
          </div>
        ) : null}
      </div>
      <div className={cn("px-4 py-3", contentClassName)}>{children}</div>
    </section>
  );
}
