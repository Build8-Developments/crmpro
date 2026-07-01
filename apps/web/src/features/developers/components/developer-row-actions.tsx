"use client";

import type { Developer } from "@/features/developers/types";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeveloperUiStore } from "@/features/developers/stores/developer-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface DeveloperRowActionsProps {
  developer: Developer;
}

export function DeveloperRowActions({ developer }: DeveloperRowActionsProps) {
  const openEditDialog = useDeveloperUiStore((s) => s.openEditDialog);
  const openDeleteDialog = useDeveloperUiStore((s) => s.openDeleteDialog);
  const { can } = usePermissions();

  const canUpdate = can("developer.update");
  const canDelete = can("developer.delete");

  if (!canUpdate && !canDelete) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8"
          aria-label={`Actions for ${developer.name}`}
        >
          <AppIcons.moreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {canUpdate ? (
          <DropdownMenuItem onClick={() => openEditDialog(developer.id)}>
            Edit
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            {canUpdate ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => openDeleteDialog(developer.id)}
            >
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
