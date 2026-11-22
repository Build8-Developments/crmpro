"use client";

import { useRef, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFileSize } from "@/features/files/utils/file-formatters";
import type {
  ImportDefaults,
  ImportDuplicatePolicy,
  ImportFieldDescriptor,
  ImportFieldKey,
  ImportMapping,
  ImportPreview,
} from "@/features/imports/types";
import {
  downloadImportTemplate,
  IMPORT_FILE_ACCEPT,
} from "@/features/imports/utils/import-formatters";
import { useLeadFilterOptions } from "@/features/leads/hooks";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ImportWizardStep = "upload" | "map" | "review";

const STEPS: Array<{ key: ImportWizardStep; label: string }> = [
  { key: "upload", label: "Upload file" },
  { key: "map", label: "Match columns" },
  { key: "review", label: "Review & start" },
];

/** Select value for "not imported" / "no default". */
const NONE = "__none__";

const SAMPLE_VALUES_PER_COLUMN = 3;

export function missingRequiredFields(
  fields: ImportFieldDescriptor[],
  mapping: ImportMapping,
): ImportFieldDescriptor[] {
  const mapped = new Set(Object.values(mapping));
  return fields.filter((field) => field.required && !mapped.has(field.key));
}

export function ImportStepIndicator({ step }: { step: ImportWizardStep }) {
  const current = STEPS.findIndex((item) => item.key === step);

  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((item, index) => (
        <li key={item.key} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold",
              index < current &&
                "border-primary bg-primary text-primary-foreground",
              index === current && "border-primary text-primary",
              index > current && "text-muted-foreground",
            )}
            aria-hidden
          >
            {index < current ? (
              <AppIcons.check className="size-3" />
            ) : (
              index + 1
            )}
          </span>
          <span
            className={cn(
              index === current
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
            aria-current={index === current ? "step" : undefined}
          >
            {item.label}
          </span>
          {index < STEPS.length - 1 ? (
            <span className="h-px w-6 bg-border" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function ImportUploadStep({
  file,
  busy,
  onSelect,
}: {
  file: File | null;
  busy: boolean;
  onSelect: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const browse = () => {
    if (!busy) inputRef.current?.click();
  };

  return (
    <>
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        <p>
          Any column layout works, in English or Arabic: you will match the
          columns to lead fields in the next step. Each file needs at least a
          name and a phone column. Only the first sheet of an Excel file is
          imported.
        </p>
        <button
          type="button"
          className="mt-2 font-medium text-primary hover:underline"
          onClick={downloadImportTemplate}
        >
          Download a CSV template
        </button>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Choose a file to import"
        onClick={browse}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            browse();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) onSelect(event.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border/70 bg-muted/20 hover:bg-muted/30",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <AppIcons.upload className="size-5" />
        </span>
        <span className="mt-3 text-sm font-medium text-foreground">
          {file ? file.name : "Drop a file here or browse"}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          {file
            ? formatFileSize(file.size)
            : "CSV or Excel (.xlsx) · max 25 MB · up to 20,000 rows"}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMPORT_FILE_ACCEPT}
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          onSelect(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      {file && !busy ? (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onSelect(null)}
        >
          Remove file
        </button>
      ) : null}
    </>
  );
}

/** First non-empty values of a column, for recognising it. */
function sampleValues(data: ImportPreview, column: number): string[] {
  return data.sampleRows
    .map((row) => row[column] ?? "")
    .filter((value) => value.trim().length > 0)
    .slice(0, SAMPLE_VALUES_PER_COLUMN);
}

export function ImportMappingStep({
  data,
  mapping,
  missing,
  onChange,
}: {
  data: ImportPreview;
  mapping: ImportMapping;
  missing: ImportFieldDescriptor[];
  onChange: (mapping: ImportMapping) => void;
}) {
  const headerForField = new Map<ImportFieldKey, string>();
  for (const [header, field] of Object.entries(mapping)) {
    if (field) headerForField.set(field, header);
  }
  const importedColumns = data.headers.filter((header) => mapping[header]);

  /** A field belongs to one column: picking it elsewhere moves it. */
  const setField = (header: string, value: string) => {
    const next: ImportMapping = { ...mapping };
    if (value === NONE) {
      next[header] = null;
    } else {
      const field = value as ImportFieldKey;
      const previous = headerForField.get(field);
      if (previous && previous !== header) next[previous] = null;
      next[header] = field;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{data.fileName}</span> ·{" "}
        {formatNumber(data.totalRows)}{" "}
        {data.totalRows === 1 ? "row" : "rows"} ·{" "}
        {importedColumns.length} of {data.headers.length} columns will be
        imported. We matched what we could — check each column.
      </p>

      {missing.length > 0 ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
        >
          <AppIcons.alertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Match a column to{" "}
          {missing.map((field) => field.label).join(" and ")} to continue.
        </p>
      ) : null}

      <div className="max-h-[22rem] overflow-y-auto rounded-lg border border-border/60">
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground sm:grid">
          <span>Column in your file</span>
          <span>Import as</span>
        </div>
        <ul className="divide-y divide-border/60">
          {data.headers.map((header, column) => {
            const field = mapping[header] ?? null;
            const samples = sampleValues(data, column);
            return (
              <li
                key={header}
                className="grid grid-cols-1 items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-3"
              >
                <div className="min-w-0">
                  <p
                    dir="auto"
                    className={cn(
                      "truncate text-sm font-medium",
                      !field && "text-muted-foreground",
                    )}
                  >
                    {header}
                  </p>
                  <p
                    dir="auto"
                    className="truncate text-[11px] text-muted-foreground"
                  >
                    {samples.length > 0 ? samples.join(" · ") : "No values"}
                  </p>
                </div>
                <Select
                  value={field ?? NONE}
                  onValueChange={(value) => setField(header, value)}
                >
                  <SelectTrigger
                    className="h-8 min-w-0"
                    aria-label={`Import "${header}" as`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Don&apos;t import</SelectItem>
                    {data.fields.map((option) => {
                      const usedBy = headerForField.get(option.key);
                      return (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                          {option.required ? " *" : ""}
                          {usedBy && usedBy !== header ? " (in use)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-[11px] text-muted-foreground">
        * Required. Phones with a lost leading zero, Arabic digits and budgets
        like &quot;2.5M&quot; or &quot;٣ مليون&quot; are cleaned up
        automatically. Unknown sources, projects and options are left empty.
      </p>
    </div>
  );
}

function DefaultSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  hint,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: Array<{ id: string; name: string }>;
  placeholder: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value ?? NONE}
        onValueChange={(next) =>
          onChange(next === NONE || next === "" ? undefined : next)
        }
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-full min-w-0" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const POLICY_OPTIONS: Array<{
  value: ImportDuplicatePolicy;
  title: string;
  help: string;
}> = [
  {
    value: "SKIP",
    title: "Skip existing phones (recommended)",
    help: "Rows whose phone already belongs to a lead are skipped and listed in the import report.",
  },
  {
    value: "CREATE",
    title: "Import anyway",
    help: "Every row becomes a new lead, even if the phone already exists.",
  },
];

export function ImportReviewStep({
  data,
  mapping,
  defaults,
  onDefaultsChange,
  policy,
  onPolicyChange,
  canAssign,
}: {
  data: ImportPreview;
  mapping: ImportMapping;
  defaults: ImportDefaults;
  onDefaultsChange: (defaults: ImportDefaults) => void;
  policy: ImportDuplicatePolicy;
  onPolicyChange: (policy: ImportDuplicatePolicy) => void;
  canAssign: boolean;
}) {
  const { pipelines, sources, users, projects } = useLeadFilterOptions();
  const mappedFields = new Set(Object.values(mapping));
  const pipeline = pipelines.data?.find(
    (item) => item.id === defaults.pipelineId,
  );
  const stages = (pipeline?.stages ?? [])
    .filter((stage) => !stage.isClosed)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const set = (patch: Partial<ImportDefaults>) =>
    onDefaultsChange({ ...defaults, ...patch });

  const columnHint = (field: ImportFieldKey, noun: string) =>
    mappedFields.has(field)
      ? `Used when a row's ${noun} is empty or not recognised.`
      : undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Rows" value={formatNumber(data.totalRows)} />
        <Stat
          label="Columns imported"
          value={`${[...mappedFields].filter(Boolean).length} / ${data.headers.length}`}
        />
        <Stat
          label="Format"
          value={data.fileType === "xlsx" ? "Excel" : "CSV"}
        />
      </div>

      <section className="space-y-2">
        <div>
          <h3 className="text-sm font-medium">Defaults for every lead</h3>
          <p className="text-xs text-muted-foreground">
            Optional. Values from your file win over these.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DefaultSelect
            label="Source"
            value={defaults.sourceId}
            onChange={(sourceId) => set({ sourceId })}
            options={sources.data ?? []}
            placeholder="No source"
            hint={columnHint("source", "source")}
          />
          <DefaultSelect
            label="Project"
            value={defaults.projectId}
            onChange={(projectId) => set({ projectId })}
            options={projects.data ?? []}
            placeholder="No project"
            hint={
              mappedFields.has("project")
                ? "Added to the projects found in the file."
                : undefined
            }
          />
          <DefaultSelect
            label="Pipeline"
            value={defaults.pipelineId}
            onChange={(pipelineId) =>
              set({ pipelineId, pipelineStageId: undefined })
            }
            options={pipelines.data ?? []}
            placeholder="Default pipeline"
          />
          <DefaultSelect
            label="Stage"
            value={defaults.pipelineStageId}
            onChange={(pipelineStageId) => set({ pipelineStageId })}
            options={stages}
            placeholder="First stage"
            disabled={!defaults.pipelineId}
          />
          {canAssign ? (
            <DefaultSelect
              label="Assign to"
              value={defaults.assignedUserId}
              onChange={(assignedUserId) => set({ assignedUserId })}
              options={users.data ?? []}
              placeholder="Leave unassigned"
              hint={columnHint("assignee", "agent")}
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <h3 id="import-duplicates-title" className="text-sm font-medium">
          Leads that already exist
        </h3>
        <div
          role="radiogroup"
          aria-labelledby="import-duplicates-title"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {POLICY_OPTIONS.map((option) => {
            const checked = policy === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onPolicyChange(option.value)}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-start transition-colors",
                  checked
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                    checked ? "border-primary" : "border-muted-foreground/40",
                  )}
                >
                  {checked ? (
                    <span className="size-2 rounded-full bg-primary" />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {option.title}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {option.help}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {mappedFields.has("assignee") && canAssign ? (
        <p className="text-[11px] text-muted-foreground">
          Agents are matched by email or exact name; unknown agents leave the
          lead {defaults.assignedUserId ? "with the default agent" : "unassigned"}.
        </p>
      ) : null}
      {!canAssign ? (
        <p className="text-[11px] text-muted-foreground">
          Imported leads stay unassigned until a manager assigns them.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-2">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
