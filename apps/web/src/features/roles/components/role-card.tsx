"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Role } from "@/features/roles/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

interface RoleCardProps {
  role: Role;
  onClick: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
}

export function RoleCard({ role, onClick, onEdit, onArchive }: RoleCardProps) {
  const { can } = usePermissions();
  const canManage = can("role.manage");

  return (
    <div 
      className={cn(
        "group flex flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:shadow-md",
        role.isSystem ? "border-muted-foreground/20" : "hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold tracking-tight text-foreground">{role.name}</h3>
            <Badge variant={role.isSystem ? "secondary" : "outline"} className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-medium">
              {role.isSystem ? "System" : "Custom"}
            </Badge>
          </div>
          {role.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{role.description}</p>
          ) : (
            <p className="text-xs italic text-muted-foreground/60">No description provided</p>
          )}
        </div>
        
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", role.isSystem ? "bg-muted/70 text-muted-foreground" : "bg-primary/10 text-primary")}>
          {role.isSystem ? <AppIcons.lock className="size-4" /> : <AppIcons.roles className="size-4" />}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted/50">
            <AppIcons.users className="size-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none text-foreground">{formatNumber(role.userCount)}</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Users</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted/50">
            <AppIcons.check className="size-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none text-foreground">{formatNumber(role.permissionCount)}</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Permissions</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2 border-t border-border/50 pt-4">
        <Button variant="outline" size="sm" className="h-8 flex-1 bg-background" onClick={onClick}>
          {role.isSystem ? "View Permissions" : "Edit Permissions"}
        </Button>
        
        {canManage && !role.isSystem ? (
          <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {onEdit && (
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={onEdit} title="Rename Role">
                <AppIcons.edit className="size-4" />
              </Button>
            )}
            {onArchive && (
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={onArchive} disabled={role.userCount > 0} title={role.userCount > 0 ? "Cannot archive role with active users" : "Archive Role"}>
                <AppIcons.archive className="size-4" />
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
