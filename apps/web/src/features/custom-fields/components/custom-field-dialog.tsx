"use client";

import { useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { AppIcons } from "@/components/icons/app-icons";
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
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { createCustomField, updateCustomField } from "../api";
import {
  CUSTOM_FIELD_LIMITS,
  CUSTOM_FIELD_TYPE_LABELS,
  CUSTOM_FIELD_TYPES,
  isOptionFieldType,
  type CustomFieldDefinition,
  type CustomFieldType,
} from "../types";

export type CustomFieldDialogState =
  | { mode: "create" }
  | { mode: "edit"; field: CustomFieldDefinition }
  | null;

export function CustomFieldDialog({
  state,
  onClose,
  invalidateKeys,
}: {
  state: CustomFieldDialogState;
  onClose: () => void;
  invalidateKeys: QueryKey[];
}) {
  const field = state?.mode === "edit" ? state.field : null;

  return (
    <Dialog open={state !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{field ? "Edit field" : "New custom field"}</DialogTitle>
          <DialogDescription>
            {field
              ? "The type can't change once leads may have values for it."
              : "Shown on every lead's form and details."}
          </DialogDescription>
        </DialogHeader>
        {state ? (
          // Keyed so the form starts from the field each time it opens.
          <CustomFieldForm
            key={field?.id ?? "new"}
            field={field}
            onDone={onClose}
            invalidateKeys={invalidateKeys}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CustomFieldForm({
  field,
  onDone,
  invalidateKeys,
}: {
  field: CustomFieldDefinition | null;
  onDone: () => void;
  invalidateKeys: QueryKey[];
}) {
  const [label, setLabel] = useState(field?.label ?? "");
  const [type, setType] = useState<CustomFieldType>(field?.type ?? "TEXT");
  const [description, setDescription] = useState(field?.description ?? "");
  const [isRequired, setIsRequired] = useState(field?.isRequired ?? false);
  const [options, setOptions] = useState<string[]>(
    field?.options?.length ? field.options : ["", ""],
  );

  const hasOptions = isOptionFieldType(type);
  const cleanOptions = [...new Set(options.map((option) => option.trim()).filter(Boolean))];
  const removedOptions = (field?.options ?? []).filter((option) => !cleanOptions.includes(option));
  const valid = label.trim().length > 0 && (!hasOptions || cleanOptions.length > 0);

  const save = useApiMutation<CustomFieldDefinition, void>({
    mutationFn: () => {
      const common = {
        label: label.trim(),
        description: description.trim() || null,
        isRequired,
        ...(hasOptions ? { options: cleanOptions } : {}),
      };
      return field ? updateCustomField(field.id, common) : createCustomField({ ...common, type });
    },
    successMessage: field ? "Field updated" : "Field added",
    invalidateKeys,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    try {
      await save.mutateAsync();
      onDone();
    } catch {
      // toast handled
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="custom-field-label">Name</Label>
        <Input
          id="custom-field-label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          maxLength={CUSTOM_FIELD_LIMITS.label}
          placeholder="e.g. Unit type"
          required
          autoFocus
        />
        {field ? (
          <p className="text-xs text-muted-foreground">
            Key <span className="font-mono">{field.key}</span> stays the same (used in imports and the API).
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom-field-type">Type</Label>
        <Select
          value={type}
          onValueChange={(next) => setType(next as CustomFieldType)}
          disabled={field !== null}
        >
          <SelectTrigger id="custom-field-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CUSTOM_FIELD_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {CUSTOM_FIELD_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasOptions ? (
        <OptionsEditor options={options} onChange={setOptions} removed={removedOptions} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="custom-field-description">Help text</Label>
        <Input
          id="custom-field-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={CUSTOM_FIELD_LIMITS.description}
          placeholder="Optional, shown under the input"
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          className="mt-0.5"
          checked={isRequired}
          onCheckedChange={(checked) => setIsRequired(Boolean(checked))}
        />
        <span>
          Required
          <span className="block text-xs text-muted-foreground">
            New leads need a value. Imports only check it when the column is mapped.
          </span>
        </span>
      </label>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid || save.isPending}>
          {save.isPending ? "Saving..." : field ? "Save changes" : "Add field"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function OptionsEditor({
  options,
  onChange,
  removed,
}: {
  options: string[];
  onChange: (options: string[]) => void;
  removed: string[];
}) {
  const update = (index: number, value: string) =>
    onChange(options.map((option, position) => (position === index ? value : option)));
  const remove = (index: number) => onChange(options.filter((_, position) => position !== index));

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Options</legend>
      <ul className="space-y-1.5">
        {options.map((option, index) => (
          // Options are plain strings that can repeat while typing: index keys.
          <li key={index} className="flex items-center gap-1.5">
            <Input
              value={option}
              onChange={(event) => update(index, event.target.value)}
              maxLength={CUSTOM_FIELD_LIMITS.option}
              placeholder={`Option ${index + 1}`}
              aria-label={`Option ${index + 1}`}
              className="h-8 text-sm"
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Remove option ${index + 1}`}
              disabled={options.length <= 1}
              onClick={() => remove(index)}
            >
              <AppIcons.close className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={options.length >= CUSTOM_FIELD_LIMITS.options}
        onClick={() => onChange([...options, ""])}
      >
        <AppIcons.create className="size-3.5" />
        Add option
      </Button>
      {removed.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Removing {removed.join(", ")}: leads that already have it keep it; it just can&apos;t be
          picked any more.
        </p>
      ) : null}
    </fieldset>
  );
}
