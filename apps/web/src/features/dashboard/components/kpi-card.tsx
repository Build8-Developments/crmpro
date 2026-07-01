import type { AppIcon } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DASHBOARD_ENTER_CLASS, dashboardEnterStyle } from "../utils";

interface KpiCardProps {
  title: string;
  value: string;
  badge?: string;
  icon: AppIcon;
  tone?: "default" | "warning" | "success";
  index?: number;
}

export function KpiCard({
  title,
  value,
  badge,
  icon: Icon,
  tone = "default",
  index = 0,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        DASHBOARD_ENTER_CLASS,
        "gap-0 overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        tone === "warning" && "border-amber-500/35 bg-amber-500/5",
      )}
      style={dashboardEnterStyle(index)}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            tone === "warning"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : tone === "success"
                ? "bg-primary/12 text-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" stroke={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </span>
            {badge ? (
              <Badge
                variant={tone === "warning" ? "warning" : "secondary"}
                className="h-5 shrink-0 px-1.5 text-[10px] font-medium"
              >
                {badge}
              </Badge>
            ) : null}
          </div>
          <p
            className={cn(
              "text-xl font-semibold leading-none tracking-tight tabular-nums",
              tone === "warning" && "text-amber-700 dark:text-amber-400",
            )}
          >
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}
