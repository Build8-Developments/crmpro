"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TenantRowActions, TenantRowContextMenu } from "@/features/tenants/components/tenant-row-actions";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { TenantListItem } from "@/features/tenants/types";
import {
  tenantStatusBadgeClass,
  tenantStatusLabel,
} from "@/features/tenants/utils/format";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TenantsTableProps {
  tenants: TenantListItem[];
}

export function TenantsTable({ tenants }: TenantsTableProps) {
  return (
    <div className="overflow-x-auto bg-background">
      <table className="w-full min-w-[800px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr className="text-left">
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Tenant
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase sm:table-cell">
              Slug
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Plan
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Status
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase md:table-cell">
              Created
            </th>
            <th className="h-8 w-12 px-3" />
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <ContextMenu key={tenant.id}>
              <ContextMenuTrigger asChild>
                <tr
                  className={cn(
                    "border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20",
                    tenant.status === "SUSPENDED" && "bg-amber-500/[0.03]",
                    tenant.status === "CANCELLED" && "opacity-60",
                  )}
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="block min-w-0 text-left"
                    >
                      <span className="truncate text-sm font-medium text-foreground hover:underline">
                        {tenant.name}
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">
                    <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px]">
                      {tenant.slug}
                    </code>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-[10px] font-medium"
                    >
                      {tenant.plan.name}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={tenantStatusBadgeClass(tenant.status)}
                    >
                      {tenantStatusLabel(tenant.status)}
                    </Badge>
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
                    {formatRelativeTime(tenant.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <TenantRowActions tenant={tenant} />
                  </td>
                </tr>
              </ContextMenuTrigger>
              <TenantRowContextMenu tenant={tenant} />
            </ContextMenu>
          ))}
        </tbody>
      </table>
    </div>
  );
}
