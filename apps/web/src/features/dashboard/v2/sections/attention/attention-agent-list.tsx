"use client";

import Link from "next/link";
import { useState } from "react";
import { AppIcons, type AppIcon } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { useNudgeAgent } from "./attention-hooks";
import {
  leadsHref,
  type AttentionAgentRow,
  type NudgeKind,
} from "./attention-types";

export interface AttentionAgentListRow extends AttentionAgentRow {
  /** Main figure (e.g. "7 tasks"). */
  primary: string;
  /** Second line (e.g. "on 4 leads · oldest 3d"). */
  secondary?: string;
}

interface AttentionAgentListProps {
  title: string;
  icon: AppIcon;
  rows: AttentionAgentListRow[];
  /** Agents beyond the top rows, if any. */
  moreCount?: number;
  nudgeKind: NudgeKind;
  /** lead.assign: may nudge and reassign. */
  canManage: boolean;
}

/** Per-agent breakdown with "nudge" and "reassign" for managers. */
export function AttentionAgentList({
  title,
  icon: Icon,
  rows,
  moreCount = 0,
  nudgeKind,
  canManage,
}: AttentionAgentListProps) {
  const nudge = useNudgeAgent();
  const [nudged, setNudged] = useState<ReadonlySet<string>>(new Set());

  const sendNudge = (userId: string) => {
    nudge.mutate(
      { userId, kind: nudgeKind },
      {
        onSuccess: (result) => {
          if (result.sent || result.reason === "ALREADY_NUDGED") {
            setNudged((current) => new Set(current).add(userId));
          }
        },
      },
    );
  };

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/50 px-3.5 py-2.5">
        <Icon className="size-3.5 text-muted-foreground" stroke={1.75} />
        <h3 className="truncate text-xs font-semibold">{title}</h3>
      </div>
      <ul className="divide-y divide-border/50">
        {rows.map((row) => {
          const pending =
            nudge.isPending && nudge.variables?.userId === row.userId;
          const done = nudged.has(row.userId);
          return (
            <li key={row.userId} className="flex items-center gap-3 px-3.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{row.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  <Link href={leadsHref(row.listQuery)} className="text-foreground tabular-nums hover:underline">
                    {row.primary}
                  </Link>
                  {row.secondary ? ` · ${row.secondary}` : null}
                </p>
              </div>
              {canManage ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={pending || done}
                    onClick={() => sendNudge(row.userId)}
                    title={done ? "Reminded — you can nudge again in an hour" : "Send an in-app reminder"}
                  >
                    {pending ? (
                      <AppIcons.loader className="animate-spin" />
                    ) : done ? (
                      <AppIcons.check />
                    ) : (
                      <AppIcons.notifications />
                    )}
                    {done ? "Nudged" : "Nudge"}
                  </Button>
                  <Button type="button" size="xs" variant="ghost" asChild>
                    <Link href={leadsHref(row.listQuery)} title="Open their leads and use Assign">
                      Reassign
                    </Link>
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {moreCount > 0 ? (
        <p className="border-t border-border/50 px-3.5 py-2 text-[11px] text-muted-foreground">
          +{formatNumber(moreCount)} more {moreCount === 1 ? "agent" : "agents"}
        </p>
      ) : null}
    </div>
  );
}
