import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_LIST_HEADER_HEIGHT,
  DASHBOARD_LIST_ROW_HEIGHT,
} from "../utils";

interface DashboardDetailListProps {
  height: number;
  rowCount: number;
  title: string;
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardDetailList({
  height,
  rowCount,
  title,
  legend,
  children,
  className,
}: DashboardDetailListProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-md border border-border/50 bg-muted/15",
        className,
      )}
      style={{ height }}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b border-border/50 px-2.5"
        style={{ height: DASHBOARD_LIST_HEADER_HEIGHT }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {legend ? (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {legend}
          </div>
        ) : null}
      </div>
      <div
        className="grid divide-y divide-border/50"
        style={{
          height: rowCount * DASHBOARD_LIST_ROW_HEIGHT,
          gridTemplateRows: `repeat(${rowCount}, ${DASHBOARD_LIST_ROW_HEIGHT}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Fixed-height row — use inside DashboardDetailList. */
export function DashboardDetailListRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 px-2.5",
        className,
      )}
      style={{ height: DASHBOARD_LIST_ROW_HEIGHT }}
    >
      {children}
    </div>
  );
}
