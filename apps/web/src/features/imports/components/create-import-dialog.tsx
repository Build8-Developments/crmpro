"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFileSize } from "@/features/files/utils/file-formatters";
import {
  useCreateLeadImport,
  usePreviewLeadImport,
} from "@/features/imports/mutations";
import { useImportUiStore } from "@/features/imports/stores/import-ui-store";
import type {
  ImportDefaults,
  ImportDuplicatePolicy,
  ImportField,
  ImportMapping,
  ImportPreview,
} from "@/features/imports/types";
import {
  downloadImportTemplate,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from "@/features/imports/utils/import-formatters";
import { useLeadFilterOptions } from "@/features/leads/hooks";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Step = "upload" | "map" | "review";

const STEPS: Step[] = ["upload", "map", "review"];
const NONE = "__none__";
const SAMPLE_ROWS = 5;

function isSpreadsheet(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") || name.endsWith(".xlsx");
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function CreateImportDialog() {
  const t = useTranslations("imports");
  const open = useImportUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useImportUiStore((s) => s.closeCreateDialog);
  const openJobDetail = useImportUiStore((s) => s.openJobDetail);
  const { can } = usePermissions();
  const canAssign = can("lead.assign");
  const preview = usePreviewLeadImport();
  const createImport = useCreateLeadImport();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [defaults, setDefaults] = useState<ImportDefaults>({});
  const [policy, setPolicy] = useState<ImportDuplicatePolicy>("SKIP");
  const [error, setError] = useState<string | null>(null);

  const busy = preview.isPending || createImport.isPending;
  const fields = (data?.fields ?? []).filter(
    (field) => canAssign || field.key !== "assignee",
  );
  const missingRequired = fields.filter(
    (field) => field.required && field.kind === "core" && !(field.key in mapping),
  );
  const missingCustom = fields.filter(
    (field) => field.required && field.kind === "custom" && !(field.key in mapping),
  );

  const reset = () => {
    setStep("upload");
    setFile(null);
    setData(null);
    setMapping({});
    setDefaults({});
    setPolicy("SKIP");
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    closeCreateDialog();
    reset();
  };

  const handleRead = async () => {
    if (!file) return;
    setError(null);
    try {
      const result = await preview.mutateAsync(file);
      const suggested = { ...result.suggestedMapping };
      if (!canAssign) delete suggested.assignee;
      setData(result);
      setMapping(suggested);
      setStep("map");
    } catch (err) {
      setError(errorText(err, t("errors.read")));
    }
  };

  const handleStart = async () => {
    if (!data) return;
    setError(null);
    const cleanDefaults = Object.fromEntries(
      Object.entries(defaults).filter(([, value]) => Boolean(value)),
    ) as ImportDefaults;
    try {
      const job = await createImport.mutateAsync({
        fileAssetId: data.fileAssetId,
        mapping,
        ...(Object.keys(cleanDefaults).length > 0
          ? { defaults: cleanDefaults }
          : {}),
        duplicatePolicy: policy,
      });
      closeCreateDialog();
      reset();
      openJobDetail(job.id);
    } catch (err) {
      setError(errorText(err, t("errors.start")));
    }
  };

  if (!can("import-job.create")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} />

        <div className="min-w-0 space-y-3">
          {step === "upload" ? (
            <UploadStep
              file={file}
              busy={busy}
              onSelect={(next) => {
                setError(null);
                if (next && !isSpreadsheet(next)) {
                  setError(t("errors.type"));
                  return;
                }
                if (next && next.size > MAX_IMPORT_FILE_SIZE_BYTES) {
                  setError(t("errors.size"));
                  return;
                }
                setFile(next);
              }}
            />
          ) : null}

          {step === "map" && data ? (
            <MappingStep
              data={data}
              fields={fields}
              mapping={mapping}
              onChange={setMapping}
              missingCustom={missingCustom}
            />
          ) : null}

          {step === "review" && data ? (
            <ReviewStep
              data={data}
              mapping={mapping}
              defaults={defaults}
              onDefaultsChange={setDefaults}
              policy={policy}
              onPolicyChange={setPolicy}
              canAssign={canAssign}
            />
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              step === "upload"
                ? handleClose()
                : setStep(step === "review" ? "map" : "upload")
            }
          >
            {step === "upload" ? t("cancel") : t("back")}
          </Button>

          {step === "upload" ? (
            <Button
              type="button"
              disabled={!file || busy}
              onClick={() => void handleRead()}
            >
              {preview.isPending ? (
                <AppIcons.loader className="size-4 animate-spin" />
              ) : null}
              {preview.isPending ? t("reading") : t("next")}
            </Button>
          ) : null}

          {step === "map" ? (
            <Button
              type="button"
              disabled={missingRequired.length > 0}
              onClick={() => setStep("review")}
            >
              {missingRequired.length > 0
                ? t("mapRequired", {
                    fields: missingRequired.map((field) => field.label).join(", "),
                  })
                : t("next")}
            </Button>
          ) : null}

          {step === "review" ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void handleStart()}
            >
              {createImport.isPending ? (
                <AppIcons.loader className="size-4 animate-spin" />
              ) : null}
              {createImport.isPending
                ? t("starting")
                : t("start", { count: data?.totalRows ?? 0 })}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const t = useTranslations("imports.steps");
  const current = STEPS.indexOf(step);

  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((item, index) => (
        <li key={item} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold",
              index < current && "border-primary bg-primary text-primary-foreground",
              index === current && "border-primary text-primary",
              index > current && "text-muted-foreground",
            )}
          >
            {index < current ? <AppIcons.check className="size-3" /> : index + 1}
          </span>
          <span
            className={cn(
              index === current ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {t(item)}
          </span>
          {index < STEPS.length - 1 ? (
            <span className="h-px w-6 bg-border" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function UploadStep({
  file,
  busy,
  onSelect,
}: {
  file: File | null;
  busy: boolean;
  onSelect: (file: File | null) => void;
}) {
  const t = useTranslations("imports");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <>
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        <p>{t("uploadHelp")}</p>
        <button
          type="button"
          className="mt-2 font-medium text-primary hover:underline"
          onClick={downloadImportTemplate}
        >
          {t("downloadTemplate")}
        </button>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!busy) inputRef.current?.click();
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
          {file ? file.name : t("dropHere")}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          {file ? formatFileSize(file.size) : t("fileLimits")}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          onSelect(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </>
  );
}

function columnLabel(header: string, index: number, fallback: string) {
  return header.trim() ? header : fallback.replace("{n}", String(index + 1));
}

function MappingStep({
  data,
  fields,
  mapping,
  onChange,
  missingCustom,
}: {
  data: ImportPreview;
  fields: ImportField[];
  mapping: ImportMapping;
  onChange: (mapping: ImportMapping) => void;
  missingCustom: ImportField[];
}) {
  const t = useTranslations("imports");
  const columnFallback = t("columnN", { n: "{n}" });
  const mappedColumns = new Set(Object.values(mapping));
  const ignored = data.headers.length - mappedColumns.size;
  const firstRow = data.sampleRows[0] ?? [];

  const setField = (key: string, value: string) => {
    const next = { ...mapping };
    delete next[key];
    if (value !== NONE) {
      const column = Number(value);
      for (const [other, mapped] of Object.entries(next)) {
        if (mapped === column) delete next[other];
      }
      next[key] = column;
    }
    onChange(next);
  };

  const fieldForColumn = (column: number) =>
    fields.find((field) => mapping[field.key] === column);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t("mapHelp", { rows: data.totalRows, file: data.fileName })}
      </p>

      <div className="max-h-72 space-y-1.5 overflow-y-auto pe-1">
        {fields.map((field) => {
          const column = mapping[field.key];
          return (
            <div
              key={field.key}
              className="grid grid-cols-1 items-center gap-1.5 rounded-lg border px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{field.label}</span>
                  {field.required ? (
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      {t("required")}
                    </Badge>
                  ) : null}
                  {field.kind === "custom" ? (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {t("customField")}
                    </Badge>
                  ) : null}
                </p>
                {column !== undefined && firstRow[column] ? (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t("example", { value: firstRow[column] })}
                  </p>
                ) : null}
              </div>
              <Select
                value={column === undefined ? NONE : String(column)}
                onValueChange={(value) => setField(field.key, value)}
              >
                <SelectTrigger className="h-8 min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("dontImport")}</SelectItem>
                  {data.headers.map((header, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {columnLabel(header, index, columnFallback)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {missingCustom.length > 0 ? (
        <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AppIcons.alertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {t("requiredCustomWarning", {
            fields: missingCustom.map((field) => field.label).join(", "),
          })}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("previewTitle")}
          {ignored > 0 ? ` · ${t("ignoredColumns", { count: ignored })}` : ""}
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                {data.headers.map((header, index) => {
                  const field = fieldForColumn(index);
                  return (
                    <th
                      key={index}
                      className="whitespace-nowrap px-2.5 py-1.5 text-start font-medium"
                    >
                      <span className={cn(!field && "text-muted-foreground")}>
                        {columnLabel(header, index, columnFallback)}
                      </span>
                      <span
                        className={cn(
                          "block text-[10px] font-normal",
                          field ? "text-primary" : "text-muted-foreground/70",
                        )}
                      >
                        {field ? `→ ${field.label}` : t("notImported")}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.sampleRows.slice(0, SAMPLE_ROWS).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t">
                  {data.headers.map((_, index) => (
                    <td
                      key={index}
                      className={cn(
                        "max-w-48 truncate whitespace-nowrap px-2.5 py-1.5",
                        !mappedColumns.has(index) && "text-muted-foreground/60",
                      )}
                    >
                      {row[index]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: Array<{ id: string; name: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value ?? NONE}
        onValueChange={(next) => onChange(next === NONE ? undefined : next)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 min-w-0">
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
    </div>
  );
}

function ReviewStep({
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
  const t = useTranslations("imports");
  const { pipelines, sources, users, projects } = useLeadFilterOptions();
  const pipeline = pipelines.data?.find((item) => item.id === defaults.pipelineId);
  const stages = (pipeline?.stages ?? []).filter((stage) => !stage.isClosed);

  const set = (patch: Partial<ImportDefaults>) =>
    onDefaultsChange({ ...defaults, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label={t("summary.rows")} value={data.totalRows} />
        <Stat label={t("summary.mapped")} value={Object.keys(mapping).length} />
        <Stat
          label={t("summary.format")}
          value={data.fileKind === "xlsx" ? "Excel" : "CSV"}
        />
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{t("defaultsTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("defaultsHelp")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DefaultSelect
            label={t("defaults.source")}
            value={defaults.sourceId}
            onChange={(sourceId) => set({ sourceId })}
            options={sources.data ?? []}
            placeholder={t("defaults.none")}
          />
          <DefaultSelect
            label={t("defaults.project")}
            value={defaults.projectId}
            onChange={(projectId) => set({ projectId })}
            options={projects.data ?? []}
            placeholder={t("defaults.none")}
          />
          <DefaultSelect
            label={t("defaults.pipeline")}
            value={defaults.pipelineId}
            onChange={(pipelineId) => set({ pipelineId, stageId: undefined })}
            options={pipelines.data ?? []}
            placeholder={t("defaults.defaultPipeline")}
          />
          <DefaultSelect
            label={t("defaults.stage")}
            value={defaults.stageId}
            onChange={(stageId) => set({ stageId })}
            options={stages}
            placeholder={t("defaults.firstStage")}
            disabled={!defaults.pipelineId}
          />
          {canAssign ? (
            <DefaultSelect
              label={t("defaults.assignee")}
              value={defaults.assignedUserId}
              onChange={(assignedUserId) => set({ assignedUserId })}
              options={users.data ?? []}
              placeholder={t("defaults.unassigned")}
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("duplicatesTitle")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(["SKIP", "CREATE"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onPolicyChange(value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-start transition-colors",
                policy === value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <span className="block text-sm font-medium">
                {t(`duplicates.${value}.title`)}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {t(`duplicates.${value}.help`)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-2 py-2">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
