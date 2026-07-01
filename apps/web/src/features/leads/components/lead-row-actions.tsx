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

interface LeadRowActionsProps {
  lead: Lead;
}

export function LeadRowActions({ lead }: LeadRowActionsProps) {
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
        <DropdownMenuItem disabled>Open lead</DropdownMenuItem>
        <DropdownMenuItem disabled>Assign</DropdownMenuItem>
        <DropdownMenuItem disabled>Move stage</DropdownMenuItem>
        {lead.status === "OPEN" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Archive</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
