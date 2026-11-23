"use client";

import type { ReactNode } from "react";
import {
  IconArchive,
  IconArrowBackUp,
  IconBrandWhatsapp,
  IconCopy,
  IconDotsVertical,
  IconExternalLink,
  IconNotes,
  IconPencil,
  IconPhoneCall,
  IconStairs,
  IconUserPlus,
  type Icon,
} from "@tabler/icons-react";
import {
  STAGE_ICON_GLYPHS,
  StageBadge,
  stageIconKey,
  stageTint,
} from "@/components/crm/stage-visuals";
import { Button } from "@/components/ui/button";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLeadFilterOptions } from "@/features/leads/hooks";
import { useArchiveLead, useMoveLeadStage, useRestoreLead } from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import type { Lead } from "@/features/leads/types";
import { usePermissions } from "@/hooks/use-permissions";
import { runContactAction } from "./masked-contact";

interface ActionItem {
  key: string;
  label: string;
  icon: Icon;
  onSelect: () => void;
  hint?: string;
  destructive?: boolean;
}

interface StageOption {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  closeType: "WON" | "LOST" | null;
}

/** Everything you can do to a lead from a list row, grouped. */
function useLeadActions(lead: Lead) {
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const openAssignDialog = useLeadUiStore((s) => s.openAssignDialog);
  const openMoveStageDialog = useLeadUiStore((s) => s.openMoveStageDialog);
  const openEditDialog = useLeadUiStore((s) => s.openEditDialog);
  const openLogDialog = useLeadUiStore((s) => s.openLogDialog);
  const archiveLead = useArchiveLead();
  const restoreLead = useRestoreLead();
  const moveStage = useMoveLeadStage();
  const { pipelines } = useLeadFilterOptions();
  const { can } = usePermissions();

  const isOpen = lead.status === "OPEN";
  const canUpdate = can("lead.update");

  const groups: ActionItem[][] = [
    [
      { key: "open", label: "Open lead", icon: IconExternalLink, onSelect: () => openDrawer(lead.id) },
      ...(canUpdate && isOpen
        ? [
            {
              key: "log",
              label: "Log activity",
              icon: IconNotes,
              hint: "Call, visit, offer…",
              onSelect: () => openLogDialog({ leadId: lead.id, leadName: lead.fullName }),
            },
          ]
        : []),
    ],
    [
      {
        key: "call",
        label: "Call",
        icon: IconPhoneCall,
        hint: "logged",
        onSelect: () => void runContactAction(lead.id, "primaryPhone", "CALL"),
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        icon: IconBrandWhatsapp,
        hint: "logged",
        onSelect: () => void runContactAction(lead.id, "primaryPhone", "WHATSAPP"),
      },
      {
        key: "copy",
        label: "Copy phone",
        icon: IconCopy,
        hint: "logged",
        onSelect: () => void runContactAction(lead.id, "primaryPhone", "COPY"),
      },
    ],
    [
      ...(can("lead.assign") && isOpen
        ? [
            {
              key: "assign",
              label: lead.assignee ? "Reassign…" : "Assign…",
              icon: IconUserPlus,
              onSelect: () => openAssignDialog([lead.id]),
            },
          ]
        : []),
      ...(canUpdate
        ? [{ key: "edit", label: "Edit details", icon: IconPencil, onSelect: () => openEditDialog(lead.id) }]
        : []),
    ],
    canUpdate
      ? isOpen
        ? [
            {
              key: "archive",
              label: "Archive",
              icon: IconArchive,
              destructive: true,
              onSelect: () => void archiveLead.mutateAsync(lead.id),
            },
          ]
        : [
            {
              key: "restore",
              label: "Restore",
              icon: IconArrowBackUp,
              onSelect: () => void restoreLead.mutateAsync(lead.id),
            },
          ]
      : [],
  ].filter((group) => group.length > 0);

  const stages: StageOption[] =
    pipelines.data
      ?.find((pipeline) => pipeline.id === lead.pipeline.id)
      ?.stages.filter((stage) => stage.id !== lead.stage.id) ?? [];

  const moveTo = (stage: StageOption) => {
    // Lost needs a reason; Won/open stages move straight away.
    if (stage.closeType === "LOST") {
      openMoveStageDialog([lead.id], lead.pipeline.id, undefined, stage.id);
      return;
    }
    void moveStage.mutateAsync({ leadId: lead.id, pipelineStageId: stage.id });
  };

  return { groups, stages: canUpdate && isOpen ? stages : [], moveTo };
}

function ItemContent({ item }: { item: ActionItem }) {
  const Icon = item.icon;
  return (
    <>
      <Icon className={item.destructive ? "size-4 text-destructive" : "size-4"} />
      <span className="flex-1">{item.label}</span>
      {item.hint ? <span className="text-[10px] text-muted-foreground">{item.hint}</span> : null}
    </>
  );
}

function StageItemContent({ stage }: { stage: StageOption }) {
  const Icon = STAGE_ICON_GLYPHS[stageIconKey(stage)];
  return (
    <>
      <Icon className="size-4" style={{ color: stageTint(stage.color) }} />
      <span className="flex-1 truncate">{stage.name}</span>
      {stage.closeType === "LOST" ? (
        <span className="text-[10px] text-muted-foreground">needs reason</span>
      ) : null}
    </>
  );
}

function MenuHeader({ lead }: { lead: Lead }) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-2 pt-1.5 pb-2">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{lead.fullName}</span>
      <StageBadge stage={lead.stage} size="xs" />
    </div>
  );
}

export function LeadRowActions({ lead }: { lead: Lead }) {
  const { groups, stages, moveTo } = useLeadActions(lead);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 text-muted-foreground opacity-60 transition-opacity group-hover/row:opacity-100 data-[popup-open]:opacity-100"
          onClick={(event) => event.stopPropagation()}
          aria-label={`Actions for ${lead.fullName}`}
        >
          <IconDotsVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="p-0">
          <MenuHeader lead={lead} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {renderGroups(groups, stages, moveTo, "dropdown")}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LeadRowContextMenu({ lead }: { lead: Lead }) {
  const { groups, stages, moveTo } = useLeadActions(lead);

  return (
    <ContextMenuContent className="w-56">
      <ContextMenuLabel className="p-0">
        <MenuHeader lead={lead} />
      </ContextMenuLabel>
      <ContextMenuSeparator />
      {renderGroups(groups, stages, moveTo, "context")}
    </ContextMenuContent>
  );
}

/** Same groups for both menus; "Move to stage" sits after the first group. */
function renderGroups(
  groups: ActionItem[][],
  stages: StageOption[],
  moveTo: (stage: StageOption) => void,
  kind: "dropdown" | "context",
): ReactNode {
  const Item = kind === "dropdown" ? DropdownMenuItem : ContextMenuItem;
  const Separator = kind === "dropdown" ? DropdownMenuSeparator : ContextMenuSeparator;
  const Sub = kind === "dropdown" ? DropdownMenuSub : ContextMenuSub;
  const SubTrigger = kind === "dropdown" ? DropdownMenuSubTrigger : ContextMenuSubTrigger;
  const SubContent = kind === "dropdown" ? DropdownMenuSubContent : ContextMenuSubContent;

  return groups.map((group, index) => (
    <div key={group[0].key} role="group">
      {index > 0 ? <Separator /> : null}
      {group.map((item) => (
        <Item
          key={item.key}
          variant={item.destructive ? "destructive" : "default"}
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            item.onSelect();
          }}
        >
          <ItemContent item={item} />
        </Item>
      ))}
      {index === 0 && stages.length > 0 ? (
        <Sub>
          <SubTrigger>
            <IconStairs className="size-4" />
            <span className="flex-1">Move to stage</span>
          </SubTrigger>
          <SubContent className="w-52">
            {stages.map((stage) => (
              <Item key={stage.id} onClick={() => moveTo(stage)}>
                <StageItemContent stage={stage} />
              </Item>
            ))}
          </SubContent>
        </Sub>
      ) : null}
    </div>
  ));
}
