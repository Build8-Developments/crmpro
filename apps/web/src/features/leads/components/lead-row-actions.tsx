"use client";

import type { Lead } from "@/features/leads/types";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { useArchiveLead, useRestoreLead } from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface LeadRowActionsProps {
  lead: Lead;
}

export function LeadRowActions({ lead }: LeadRowActionsProps) {
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const openAssignDialog = useLeadUiStore((s) => s.openAssignDialog);
  const openMoveStageDialog = useLeadUiStore((s) => s.openMoveStageDialog);
  const openEditDialog = useLeadUiStore((s) => s.openEditDialog);
  const archiveLead = useArchiveLead();
  const restoreLead = useRestoreLead();
  const { can } = usePermissions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8"
          onClick={(event) => event.stopPropagation()}
          aria-label={`Actions for ${lead.fullName}`}
        >
          <AppIcons.moreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => openDrawer(lead.id)}>
          Open lead
        </DropdownMenuItem>
        {can("lead.update") ? (
          <DropdownMenuItem onClick={() => openEditDialog(lead.id)}>
            Edit
          </DropdownMenuItem>
        ) : null}
        {can("lead.assign") && lead.status === "OPEN" ? (
          <DropdownMenuItem onClick={() => openAssignDialog([lead.id])}>
            Assign
          </DropdownMenuItem>
        ) : null}
        {can("lead.update") && lead.status === "OPEN" ? (
          <DropdownMenuItem
            onClick={() =>
              openMoveStageDialog([lead.id], lead.pipeline.id)
            }
          >
            Move stage
          </DropdownMenuItem>
        ) : null}
        {can("lead.update") && lead.status === "OPEN" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void archiveLead.mutateAsync(lead.id)}
            >
              Archive
            </DropdownMenuItem>
          </>
        ) : null}
        {can("lead.update") && lead.status === "ARCHIVED" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void restoreLead.mutateAsync(lead.id)}
            >
              Restore
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LeadRowContextMenu({ lead }: LeadRowActionsProps) {
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const openAssignDialog = useLeadUiStore((s) => s.openAssignDialog);
  const openMoveStageDialog = useLeadUiStore((s) => s.openMoveStageDialog);
  const openEditDialog = useLeadUiStore((s) => s.openEditDialog);
  const archiveLead = useArchiveLead();
  const restoreLead = useRestoreLead();
  const { can } = usePermissions();

  return (
    <ContextMenuContent className="w-44">
      <ContextMenuItem onClick={() => openDrawer(lead.id)}>
        Open lead
      </ContextMenuItem>
      {can("lead.update") ? (
        <ContextMenuItem onClick={() => openEditDialog(lead.id)}>
          Edit
        </ContextMenuItem>
      ) : null}
      {can("lead.assign") && lead.status === "OPEN" ? (
        <ContextMenuItem onClick={() => openAssignDialog([lead.id])}>
          Assign
        </ContextMenuItem>
      ) : null}
      {can("lead.update") && lead.status === "OPEN" ? (
        <ContextMenuItem
          onClick={() =>
            openMoveStageDialog([lead.id], lead.pipeline.id)
          }
        >
          Move stage
        </ContextMenuItem>
      ) : null}
      {can("lead.update") && lead.status === "OPEN" ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => void archiveLead.mutateAsync(lead.id)}
          >
            Archive
          </ContextMenuItem>
        </>
      ) : null}
      {can("lead.update") && lead.status === "ARCHIVED" ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => void restoreLead.mutateAsync(lead.id)}
          >
            Restore
          </ContextMenuItem>
        </>
      ) : null}
    </ContextMenuContent>
  );
}

