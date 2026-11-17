"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createCustomField,
  setCustomFieldArchived,
  updateCustomField,
} from "@/features/custom-fields/api";
import { useCustomFields } from "@/features/custom-fields/hooks";
import {
  CUSTOM_FIELD_TYPES,
  type CustomFieldDefinition,
  type CustomFieldType,
} from "@/features/custom-fields/types";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { usePermissions } from "@/hooks/use-permissions";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { cn } from "@/lib/utils";

const invalidate = [queryKeys.customFields.all()];

export function CustomFieldsSettingsCard() {
  const t = useTranslations("customFields");
  const { can } = usePermissions();
  const canManage = can("custom-field.manage");
  const [showArchived, setShowArchived] = useState(false);
  const { data: fields, isLoading } = useCustomFields({ includeArchived: showArchived });
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [creating, setCreating] = useState(false);
  const toggleArchive = useApiMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      setCustomFieldArchived(id, archived),
    successMessage: t("updated"),
    invalidateKeys: invalidate,
  });

  return (
    <SettingsSection
      title={t("title")}
      description={t("description")}
      action={
        canManage ? (
          <Button size="sm" className="h-8" onClick={() => setCreating(true)}>
            <AppIcons.create className="size-3.5" />
            {t("newField")}
          </Button>
        ) : null
      }
    >
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={showArchived}
          onCheckedChange={(value) => setShowArchived(Boolean(value))}
        />
        {t("showArchived")}
        <span className="ms-auto">{t("limit")}</span>
      </label>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !fields?.length ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {fields.map((field) => (
            <li
              key={field.id}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2.5",
                field.archivedAt && "opacity-60",
              )}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {field.label}
                  {field.isRequired ? (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {t("required")}
                    </Badge>
                  ) : null}
                  {field.archivedAt ? (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {t("archived")}
                    </Badge>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t(`types.${field.type}`)} · <span className="font-mono">{field.key}</span>
                  {field.options?.length ? ` · ${field.options.join(", ")}` : ""}
                </span>
              </span>
              {canManage ? (
                <span className="flex shrink-0 gap-1">
                  {!field.archivedAt ? (
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(field)}>
                      {t("edit")}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    disabled={toggleArchive.isPending}
                    onClick={() =>
                      void toggleArchive.mutateAsync({
                        id: field.id,
                        archived: !field.archivedAt,
                      })
                    }
                  >
                    {field.archivedAt ? t("restore") : t("archive")}
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <FieldDialog
        open={creating || editing !== null}
        field={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </SettingsSection>
  );
}

function FieldDialog({
  open,
  field,
  onClose,
}: {
  open: boolean;
  field: CustomFieldDefinition | null;
  onClose: () => void;
}) {
  const t = useTranslations("customFields");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{field ? field.label : t("newField")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open ? <FieldForm key={field?.id ?? "new"} field={field} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FieldForm({
  field,
  onClose,
}: {
  field: CustomFieldDefinition | null;
  onClose: () => void;
}) {
  const t = useTranslations("customFields");
  const tCommon = useTranslations("common");
  const [label, setLabel] = useState(field?.label ?? "");
  const [type, setType] = useState<CustomFieldType>(field?.type ?? "TEXT");
  const [options, setOptions] = useState((field?.options ?? []).join("\n"));
  const [isRequired, setIsRequired] = useState(field?.isRequired ?? false);
  const needsOptions = type === "SELECT" || type === "MULTI_SELECT";
  const optionList = options
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);

  const save = useApiMutation<unknown, void>({
    mutationFn: async () =>
      field
        ? updateCustomField(field.id, {
            label: label.trim(),
            isRequired,
            ...(needsOptions ? { options: optionList } : {}),
          })
        : createCustomField({
            label: label.trim(),
            type,
            isRequired,
            ...(needsOptions ? { options: optionList } : {}),
          }),
    successMessage: field ? t("updated") : t("created"),
    invalidateKeys: invalidate,
  });

  const valid = label.trim().length > 0 && (!needsOptions || optionList.length > 0);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await save.mutateAsync();
          onClose();
        } catch {
          // toast shown
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="field-label">{t("label")}</Label>
        <Input
          id="field-label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          maxLength={60}
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>{t("type")}</Label>
        <Select
          value={type}
          onValueChange={(next) => setType(next as CustomFieldType)}
          disabled={field !== null}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CUSTOM_FIELD_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`types.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {needsOptions ? (
        <div className="space-y-2">
          <Label htmlFor="field-options">{t("options")}</Label>
          <textarea
            id="field-options"
            rows={4}
            value={options}
            onChange={(event) => setOptions(event.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <p className="text-xs text-muted-foreground">{t("optionsHelp")}</p>
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={isRequired} onCheckedChange={(value) => setIsRequired(Boolean(value))} />
        {t("required")}
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={!valid || save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
