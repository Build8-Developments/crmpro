import type { ReactNode } from "react";

interface DashboardChartsRowProps {
  pipeline?: ReactNode;
  trends?: ReactNode;
}

export function DashboardChartsRow({ pipeline, trends }: DashboardChartsRowProps) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-2">
      {pipeline}
      {trends}
    </div>
  );
}
