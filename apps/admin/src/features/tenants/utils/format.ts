import { cn } from "@/lib/utils";
import type { TenantStatus } from "@/features/tenants/types";

export function tenantStatusLabel(status: TenantStatus): string {
  switch (status) {
    case "TRIAL":
      return "Trial";
    case "ACTIVE":
      return "Active";
    case "SUSPENDED":
      return "Suspended";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export function tenantStatusBadgeClass(status: TenantStatus): string {
  return cn(
    "h-5 px-1.5 text-[10px] font-medium",
    status === "ACTIVE" &&
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    status === "TRIAL" &&
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    status === "SUSPENDED" &&
      "border-destructive/25 bg-destructive/10 text-destructive",
    status === "CANCELLED" &&
      "border-border bg-muted/50 text-muted-foreground",
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function usagePercent(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

export function paginationRangeLabel(
  page: number,
  limit: number,
  totalItems: number,
): string {
  if (totalItems === 0) return "Showing 0 tenants";

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalItems);
  return `Showing ${start}–${end} of ${totalItems.toLocaleString()} tenants`;
}
