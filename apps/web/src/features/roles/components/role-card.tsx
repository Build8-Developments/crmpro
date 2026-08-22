"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        
        <div className="flex items-center gap-1">
          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", role.isSystem ? "bg-muted/70 text-muted-foreground" : "bg-primary/10 text-primary")}>
            {role.isSystem ? <AppIcons.lock className="size-4" /> : <AppIcons.roles className="size-4" />}
          </div>
          
          {canManage && !role.isSystem ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                  <AppIcons.moreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <AppIcons.edit className="mr-2 size-4" />
                    Rename Role
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={onArchive} 
                      disabled={role.userCount > 0}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <AppIcons.archive className="mr-2 size-4" />
                      Archive Role
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
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

      <div className="mt-6 flex border-t border-border/50 pt-4">
        <Button variant="outline" size="sm" className="h-8 w-full bg-background" onClick={onClick}>
          {role.isSystem ? "View Permissions" : "Edit Permissions"}
        </Button>
      </div>
    </div>
  );
}
