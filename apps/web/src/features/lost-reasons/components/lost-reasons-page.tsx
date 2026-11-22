"use client";

import { useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLostReasons } from "@/features/leads/hooks";
import type { LostReason } from "@/features/leads/types";
import {
  createLostReason,
  deleteLostReason,
  updateLostReason,
  type LostReasonInput,
} from "@/features/lost-reasons/api";
import { usePermissions } from "@/hooks/use-permissions";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { cn } from "@/lib/utils";

const invalidateKeys = [["lost-reasons"], ["leads"]];

/**
 * Settings → Leads & sales → Lost reasons. A reason is required whenever a
 * lead is closed as Lost; "recyclable" reasons bring the lead back to its
 * agent as a re-engage task after N days (workflow spec §2.4).
 */
export function LostReasonsPage() {
  const { can } = usePermissions();
  const canManage = can("settings.manage");
  const { data, isLoading } = useLostReasons(true);
  const [newName, setNewName] = useState("");

  const create = useApiMutation({
    mutationFn: (name: string) => createLostReason({ name }),
    successMessage: "Reason added",
    invalidateKeys,
  });
  const update = useApiMutation({
    mutationFn: ({ id, input }: { id: string; input: LostReasonInput }) =>
      updateLostReason(id, input),
    invalidateKeys,
  });
  const remove = useApiMutation({
    mutationFn: (id: string) => deleteLostReason(id),
    successMessage: (result) => (result.archived ? "Reason archived (still used by leads)" : "Reason deleted"),
    invalidateKeys,
  });

  const reasons = data ?? [];

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (name.length < 2) return;
    try {
      await create.mutateAsync(name);
      setNewName("");
    } catch {
      // toast handled
    }
  };

  return (
    <div className="space-y-4 px-4 py-5 md:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Lost reasons</h1>
        <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
          Agents pick one whenever a lead is lost, so you can see where deals slip. Recyclable
          reasons send the lead back to its agent as a &quot;re-engage&quot; task after the days you set.
        </p>
      </div>

      <div className="max-w-2xl overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {canManage ? (
          <form onSubmit={handleCreate} className="flex gap-2 border-b border-border/60 p-3">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New reason, e.g. Prefers another developer"
              maxLength={80}
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" disabled={newName.trim().length < 2 || create.isPending}>
              Add
            </Button>
          </form>
        ) : null}

        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {reasons.map((reason) => (
              <LostReasonRow
                key={reason.id}
                reason={reason}
                canManage={canManage}
                onChange={(input) => update.mutate({ id: reason.id, input })}
                onDelete={() => remove.mutate(reason.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LostReasonRow({
  reason,
  canManage,
  onChange,
  onDelete,
}: {
  reason: LostReason;
  canManage: boolean;
  onChange: (input: LostReasonInput) => void;
  onDelete: () => void;
}) {
  const [days, setDays] = useState(String(reason.recycleAfterDays ?? 90));

  return (
    <li className={cn("flex flex-wrap items-center gap-3 px-4 py-3", !reason.isActive && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{reason.name}</p>
        <p className="text-xs text-muted-foreground">
          {reason.leadCount} lead{reason.leadCount === 1 ? "" : "s"}
          {reason.isActive ? "" : " · archived"}
        </p>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={reason.recyclable}
          disabled={!canManage}
          onCheckedChange={(checked) =>
            onChange({ recyclable: Boolean(checked), recycleAfterDays: Number(days) || 90 })
          }
        />
        <IconRefresh className="size-3.5" />
        Re-engage after
        <Input
          type="number"
          min={7}
          max={730}
          value={days}
          disabled={!canManage || !reason.recyclable}
          onChange={(event) => setDays(event.target.value)}
          onBlur={() => {
            const value = Number(days);
            if (reason.recyclable && value >= 7 && value !== reason.recycleAfterDays) {
              onChange({ recycleAfterDays: value });
            }
          }}
          className="h-7 w-16 text-xs"
        />
        days
      </label>

      {canManage ? (
        reason.isActive ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onDelete}>
            {reason.leadCount > 0 ? "Archive" : "Delete"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => onChange({ isActive: true })}
          >
            Restore
          </Button>
        )
      ) : null}
    </li>
  );
}
