"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { cn } from "@/lib/utils";
import {
  archiveCustomField,
  reorderCustomFields,
  restoreCustomField,
} from "../api";
import { CUSTOM_FIELDS_QUERY_KEY, useCustomFields } from "../hooks";
import {
  CUSTOM_FIELD_LIMITS,
  CUSTOM_FIELD_TYPE_LABELS,
  type CustomFieldDefinition,
} from "../types";
import { CustomFieldDialog, type CustomFieldDialogState } from "./custom-field-dialog";

// Lead lists and drawers show custom field values: refresh them too.
const invalidateKeys = [[...CUSTOM_FIELDS_QUERY_KEY], ["leads"]];

/**
 * Settings → Leads & sales → Custom fields. Extra lead fields the agency
 * defines (unit type, floor preference…). Archiving hides a field from forms,
 * imports and exports but keeps the values leads already have.
 */
export function CustomFieldsSettingsPage() {
  const { can } = usePermissions();
  const canManage = can("settings.manage");
  const { data, isLoading, isError } = useCustomFields({ includeArchived: true });
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<CustomFieldDialogState>(null);

  const fields = data ?? [];
  const active = fields.filter((field) => !field.archivedAt);
  const archived = fields.filter((field) => field.archivedAt);
  const atCap = active.length >= CUSTOM_FIELD_LIMITS.maxActive;

  const archive = useApiMutation({
    mutationFn: (id: string) => archiveCustomField(id),
    successMessage: "Field archived. Values on leads are kept.",
    invalidateKeys,
  });
  const restore = useApiMutation({
    mutationFn: (id: string) => restoreCustomField(id),
    successMessage: "Field restored",
    invalidateKeys,
  });
  const reorder = useApiMutation({
    mutationFn: (ids: string[]) => reorderCustomFields(ids),
    invalidateKeys,
  });

  const move = (index: number, offset: -1 | 1) => {
    const ids = active.map((field) => field.id);
    const target = index + offset;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  const busy = archive.isPending || restore.isPending || reorder.isPending;

  return (
    <div className="space-y-4 px-4 py-5 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Custom fields</h1>
          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
            Extra details your team records on every lead, like unit type or preferred floor. They
            appear in the lead form and drawer, and in imports and exports.
          </p>
        </div>
        {canManage ? (
          <Button
            size="sm"
            className="h-8"
            disabled={atCap}
            title={atCap ? `Up to ${CUSTOM_FIELD_LIMITS.maxActive} active fields. Archive one first.` : undefined}
            onClick={() => setDialog({ mode: "create" })}
          >
            <AppIcons.create className="size-3.5" />
            New field
          </Button>
        ) : null}
      </div>

      <div className="max-w-2xl overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
          <span>
            {active.length} of {CUSTOM_FIELD_LIMITS.maxActive} active
          </span>
          {archived.length > 0 ? (
            <label className="flex items-center gap-2">
              <Checkbox
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(Boolean(checked))}
              />
              Show archived ({archived.length})
            </label>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Custom fields could not be loaded.
          </p>
        ) : active.length === 0 && !(showArchived && archived.length > 0) ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No custom fields yet.{canManage ? " Add one to start recording extra lead details." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {active.map((field, index) => (
              <CustomFieldRow
                key={field.id}
                field={field}
                canManage={canManage}
                busy={busy}
                onMoveUp={index > 0 ? () => move(index, -1) : undefined}
                onMoveDown={index < active.length - 1 ? () => move(index, 1) : undefined}
                onEdit={() => setDialog({ mode: "edit", field })}
                onArchive={() => archive.mutate(field.id)}
              />
            ))}
            {showArchived
              ? archived.map((field) => (
                  <CustomFieldRow
                    key={field.id}
                    field={field}
                    canManage={canManage}
                    busy={busy || atCap}
                    onRestore={() => restore.mutate(field.id)}
                  />
                ))
              : null}
          </ul>
        )}
      </div>

      <CustomFieldDialog
        state={dialog}
        onClose={() => setDialog(null)}
        invalidateKeys={invalidateKeys}
      />
    </div>
  );
}

function CustomFieldRow({
  field,
  canManage,
  busy,
  onMoveUp,
  onMoveDown,
  onEdit,
  onArchive,
  onRestore,
}: {
  field: CustomFieldDefinition;
  canManage: boolean;
  busy: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  const archived = Boolean(field.archivedAt);

  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", archived && "opacity-60")}>
      {canManage && !archived ? (
        <div className="flex shrink-0 flex-col">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={`Move ${field.label} up`}
            disabled={!onMoveUp || busy}
            onClick={onMoveUp}
          >
            <AppIcons.chevronUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={`Move ${field.label} down`}
            disabled={!onMoveDown || busy}
            onClick={onMoveDown}
          >
            <AppIcons.chevronDown className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{field.label}</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {CUSTOM_FIELD_TYPE_LABELS[field.type]}
          </Badge>
          {field.isRequired ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              Required
            </Badge>
          ) : null}
          {archived ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              Archived
            </Badge>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-mono">{field.key}</span>
          {field.options?.length ? ` · ${field.options.join(", ")}` : ""}
          {field.description ? ` · ${field.description}` : ""}
        </p>
      </div>

      {canManage ? (
        <div className="flex shrink-0 gap-1">
          {onEdit ? (
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          {onArchive ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={onArchive}
            >
              Archive
            </Button>
          ) : null}
          {onRestore ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={onRestore}
            >
              Restore
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
