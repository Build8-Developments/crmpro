import Link from "next/link";
import type { AppIcon } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  badge?: string;
  icon: AppIcon;
  tone?: "default" | "warning" | "success";
  href?: string;
  className?: string;
}

export function KpiCard({
  title,
  value,
  badge,
  icon: Icon,
  tone = "default",
  href,
  className,
}: KpiCardProps) {
  const content = (
    <div
      className={cn(
        "relative flex h-full min-h-[4.75rem] flex-col justify-between gap-2 px-3.5 py-3 transition-colors",
        href && "hover:bg-muted/30",
        tone === "warning" && "bg-amber-500/[0.04]",
        className,
      )}
    >
      {tone === "warning" ? (
        <span
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber-500/70"
          aria-hidden
        />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          {title}
        </span>
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "warning"
              ? "text-amber-700 dark:text-amber-400"
              : tone === "success"
                ? "text-primary"
                : "text-muted-foreground/55",
          )}
          stroke={1.75}
        />
      </div>

      <div>
        <p
          className={cn(
            "text-[1.35rem] font-semibold leading-none tracking-tight tabular-nums",
            tone === "warning" && "text-amber-700 dark:text-amber-400",
          )}
        >
          {value}
        </p>
        {badge ? (
          <p
            className={cn(
              "mt-1.5 truncate text-[11px]",
              tone === "warning"
                ? "font-medium text-amber-700/80 dark:text-amber-400/80"
                : "text-muted-foreground",
            )}
          >
            {badge}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      {content}
    </Link>
  );
}
