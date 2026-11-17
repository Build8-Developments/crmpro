"use client";

import { useTranslations } from "next-intl";
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
import { useCustomFields } from "@/features/custom-fields/hooks";
import type {
  CustomFieldDefinition,
  CustomFieldValues,
} from "@/features/custom-fields/types";
import { cn } from "@/lib/utils";

const EMPTY = "__empty__";

/** Renders inputs for the tenant's active custom fields (lead create/edit). */
export function CustomFieldInputs({
  values,
  onChange,
}: {
  values: CustomFieldValues;
  onChange: (values: CustomFieldValues) => void;
}) {
  const { data: fields } = useCustomFields();
  const t = useTranslations("customFields");

  if (!fields?.length) return null;

  const set = (key: string, value: CustomFieldValues[string]) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sectionTitle")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.key] ?? null}
            onChange={(value) => set(field.key, value)}
          />
        ))}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDefinition;
  value: CustomFieldValues[string];
  onChange: (value: CustomFieldValues[string]) => void;
}) {
  const t = useTranslations("customFields");
  const id = `custom-${field.key}`;
  const label = (
    <Label htmlFor={id}>
      {field.label}
      {field.isRequired ? <span className="text-destructive"> *</span> : null}
    </Label>
  );

  switch (field.type) {
    case "BOOLEAN":
      return (
        <div className="space-y-2">
          {label}
          <Select
            value={value === true ? "yes" : value === false ? "no" : EMPTY}
            onValueChange={(next) => onChange(next === EMPTY ? null : next === "yes")}
          >
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY}>{t("choose")}</SelectItem>
              <SelectItem value="yes">{t("yes")}</SelectItem>
              <SelectItem value="no">{t("no")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "SELECT":
      return (
        <div className="space-y-2">
          {label}
          <Select
            value={typeof value === "string" ? value : EMPTY}
            onValueChange={(next) => onChange(next === EMPTY ? null : next)}
          >
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY}>{t("choose")}</SelectItem>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case "MULTI_SELECT": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2 sm:col-span-2">
          {label}
          <div className="flex flex-wrap gap-1.5">
            {(field.options ?? []).map((option) => {
              const active = selected.includes(option);
              return (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                    active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  <Checkbox
                    className="size-3"
                    checked={active}
                    onCheckedChange={() =>
                      onChange(
                        active
                          ? selected.filter((item) => item !== option)
                          : [...selected, option],
                      )
                    }
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </div>
      );
    }
    default:
      return (
        <div className="space-y-2">
          {label}
          <Input
            id={id}
            type={
              field.type === "NUMBER"
                ? "number"
                : field.type === "DATE"
                  ? "date"
                  : field.type === "URL"
                    ? "url"
                    : "text"
            }
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === "") return onChange(null);
              onChange(field.type === "NUMBER" ? Number(raw) : raw);
            }}
          />
        </div>
      );
  }
}

/** Read-only display for the lead drawer. */
export function CustomFieldValuesList({ values }: { values: Record<string, unknown> }) {
  const { data: fields } = useCustomFields();
  const t = useTranslations("customFields");
  const rows = (fields ?? []).filter(
    (field) => values[field.key] !== undefined && values[field.key] !== null,
  );

  if (rows.length === 0) return null;

  const display = (value: unknown) => {
    if (typeof value === "boolean") return value ? t("yes") : t("no");
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sectionTitle")}
      </h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {rows.map((field) => (
          <div key={field.id} className="rounded-lg border bg-muted/10 px-3 py-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {field.label}
            </dt>
            <dd className="mt-0.5 break-words">
              {field.type === "URL" ? (
                <a
                  href={String(values[field.key])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {display(values[field.key])}
                </a>
              ) : (
                display(values[field.key])
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
