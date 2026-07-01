import type { ReactNode } from "react";
import type { AppIcon } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { DASHBOARD_ENTER_CLASS } from "../utils";

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
    <Card
      className={cn(
        DASHBOARD_ENTER_CLASS,
        "flex flex-col gap-0 overflow-hidden py-0 transition-shadow duration-150 ease-out hover:shadow-md",
        className,
      )}
      style={style}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-3.5" stroke={2} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
              {title}
            </h3>
            {subtitle ? (
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {badges ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {badges}
          </div>
        ) : null}
      </div>
      <div className={cn("px-3.5 py-3", contentClassName)}>{children}</div>
    </Card>
  );
}
