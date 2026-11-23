"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CustomFieldDefinition } from "../types";
import type {
  CustomFieldDraft,
  CustomFieldDraftValue,
  CustomFieldErrors,
} from "../utils/custom-field-values";

const EMPTY = "__empty__";

/**
 * Inputs for the tenant's active custom fields (lead create / edit). Renders
 * nothing when the tenant has none.
 */
export function CustomFieldsFormSection({
  fields,
  value,
  errors,
  onChange,
  idPrefix,
}: {
  fields: CustomFieldDefinition[];
  value: CustomFieldDraft;
  errors: CustomFieldErrors;
  onChange: (draft: CustomFieldDraft) => void;
  /** Keeps input ids unique when two forms are mounted. */
  idPrefix: string;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-medium">More details</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <CustomFieldInput
            key={field.id}
            id={`${idPrefix}-${field.key}`}
            field={field}
            value={value[field.key] ?? null}
            error={errors[field.key]}
            onChange={(next) => onChange({ ...value, [field.key]: next })}
          />
        ))}
      </div>
    </div>
  );
}

function CustomFieldInput({
  id,
  field,
  value,
  error,
  onChange,
}: {
  id: string;
  field: CustomFieldDefinition;
  value: CustomFieldDraftValue;
  error?: string;
  onChange: (value: CustomFieldDraftValue) => void;
}) {
  const wide = field.type === "MULTI_SELECT" || field.type === "TEXT" || field.type === "URL";
  const describedBy = error ? `${id}-error` : field.description ? `${id}-hint` : undefined;

  return (
    <div className={cn("min-w-0 space-y-1.5", wide && "sm:col-span-2")}>
      <Label htmlFor={id}>
        {field.label}
        {field.isRequired ? <span className="text-destructive"> *</span> : null}
      </Label>
      <FieldControl
        id={id}
        field={field}
        value={value}
        invalid={Boolean(error)}
        describedBy={describedBy}
        onChange={onChange}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : field.description ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {field.description}
        </p>
      ) : null}
    </div>
  );
}

function FieldControl({
  id,
  field,
  value,
  invalid,
  describedBy,
  onChange,
}: {
  id: string;
  field: CustomFieldDefinition;
  value: CustomFieldDraftValue;
  invalid: boolean;
  describedBy?: string;
  onChange: (value: CustomFieldDraftValue) => void;
}) {
  const options = field.options ?? [];

  switch (field.type) {
    case "BOOLEAN":
      return (
        <Select
          value={value === true ? "yes" : value === false ? "no" : EMPTY}
          onValueChange={(next) => onChange(next === EMPTY ? null : next === "yes")}
        >
          <SelectTrigger id={id} className="w-full" aria-invalid={invalid} aria-describedby={describedBy}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY}>Not set</SelectItem>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      );

    case "SELECT": {
      const current = typeof value === "string" && value.length > 0 ? value : null;
      // A value whose option was removed stays visible (and kept) until changed.
      const retired = current && !options.includes(current) ? current : null;
      return (
        <Select
          value={current ?? EMPTY}
          onValueChange={(next) => onChange(next === EMPTY ? null : next)}
        >
          <SelectTrigger id={id} className="w-full" aria-invalid={invalid} aria-describedby={describedBy}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY}>Not set</SelectItem>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            {retired ? (
              <SelectItem value={retired}>{`${retired} (no longer offered)`}</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      );
    }

    case "MULTI_SELECT": {
      const selected = Array.isArray(value) ? value : [];
      const retired = selected.filter((item) => !options.includes(item));
      const toggle = (option: string) =>
        onChange(
          selected.includes(option)
            ? selected.filter((item) => item !== option)
            : [...selected, option],
        );
      return (
        <div
          id={id}
          role="group"
          aria-describedby={describedBy}
          className="flex flex-wrap gap-1.5"
        >
          {[...options, ...retired].map((option) => {
            const active = selected.includes(option);
            return (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                  active
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Checkbox className="size-3.5" checked={active} onCheckedChange={() => toggle(option)} />
                {options.includes(option) ? option : `${option} (no longer offered)`}
              </label>
            );
          })}
        </div>
      );
    }

    default:
      return (
        <Input
          id={id}
          type={field.type === "DATE" ? "date" : field.type === "URL" ? "url" : "text"}
          inputMode={field.type === "NUMBER" ? "decimal" : undefined}
          placeholder={field.type === "URL" ? "https://" : undefined}
          value={typeof value === "string" ? value : ""}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
