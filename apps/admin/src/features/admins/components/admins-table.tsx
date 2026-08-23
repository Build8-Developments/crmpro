"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AdminRowActions, AdminRowContextMenu } from "@/features/admins/components/admin-row-actions";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { AdminListItem } from "@/features/admins/types";
import { formatRelativeTime, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AdminsTableProps {
  admins: AdminListItem[];
  highlightedAdminId?: string | null;
}

export function AdminsTable({
  admins,
  highlightedAdminId,
}: AdminsTableProps) {
  return (
    <div className="overflow-x-auto bg-background">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr className="text-left">
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Admin
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase md:table-cell">
              Email
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Role
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Status
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase lg:table-cell">
              Last login
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase xl:table-cell">
              Joined
            </th>
            <th className="h-8 w-10 px-2" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <AdminTableRow
              key={admin.id}
              admin={admin}
              highlightedAdminId={highlightedAdminId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminTableRow({
  admin,
  highlightedAdminId,
}: {
  admin: AdminListItem;
  highlightedAdminId?: string | null;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const isHighlighted = highlightedAdminId === admin.id;

  useEffect(() => {
    if (isHighlighted) {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isHighlighted]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <tr
          ref={rowRef}
          className={cn(
            "border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20",
            isHighlighted && "bg-primary/5",
            !admin.isActive && "opacity-70",
          )}
        >
          <td className="px-3 py-2">
            <Link
              href={`/admins/${admin.id}`}
              className="flex w-full min-w-0 items-center gap-2.5 text-left"
            >
              <Avatar size="sm" className="size-7">
                <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                  {getInitials(admin.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium text-foreground">
                {admin.fullName}
              </span>
            </Link>
          </td>
          <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
            {admin.email}
          </td>
          <td className="px-3 py-2">
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-medium"
            >
              {admin.roleName}
            </Badge>
          </td>
          <td className="px-3 py-2">
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 text-[10px] font-medium",
                admin.isActive
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-muted/50 text-muted-foreground",
              )}
            >
              {admin.isActive ? "Active" : "Inactive"}
            </Badge>
          </td>
          <td className="hidden px-3 py-2 text-xs text-muted-foreground lg:table-cell">
            {admin.lastLoginAt ? formatRelativeTime(admin.lastLoginAt) : "Never"}
          </td>
          <td className="hidden px-3 py-2 text-xs text-muted-foreground xl:table-cell">
            {formatRelativeTime(admin.createdAt)}
          </td>
          <td className="px-2 py-2 text-right">
            <AdminRowActions admin={admin} />
          </td>
        </tr>
      </ContextMenuTrigger>
      <AdminRowContextMenu admin={admin} />
    </ContextMenu>
  );
}
