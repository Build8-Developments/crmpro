"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ImportMappingStep,
  ImportReviewStep,
  ImportStepIndicator,
  ImportUploadStep,
  missingRequiredFields,
  type ImportWizardStep,
} from "@/features/imports/components/import-wizard-steps";
import {
  useCreateLeadImport,
  usePreviewLeadImport,
} from "@/features/imports/mutations";
import { useImportUiStore } from "@/features/imports/stores/import-ui-store";
import type {
  ImportDefaults,
  ImportDuplicatePolicy,
  ImportMapping,
  ImportPreview,
} from "@/features/imports/types";
import {
  isImportSpreadsheet,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from "@/features/imports/utils/import-formatters";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

/** Drops empty defaults so the request only carries real choices. */
function compactDefaults(defaults: ImportDefaults): ImportDefaults | undefined {
  const entries = Object.entries(defaults).filter(([, value]) =>
    Boolean(value),
  );
  return entries.length > 0
    ? (Object.fromEntries(entries) as ImportDefaults)
    : undefined;
}

export function CreateImportDialog() {
  const open = useImportUiStore((s) => s.createDialogOpen);
  const session = useImportUiStore((s) => s.createDialogSession);
  const closeCreateDialog = useImportUiStore((s) => s.closeCreateDialog);
  const preview = usePreviewLeadImport();
  const createImport = useCreateLeadImport();
  const { can } = usePermissions();

  const busy = preview.isPending || createImport.isPending;

  const handleClose = () => {
    if (busy) return;
    closeCreateDialog();
  };

  if (!can("import-job.create")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-3xl">
        {/* Keyed by session: every opening starts a fresh wizard. */}
        <ImportWizard
          key={session}
          busy={busy}
          canAssign={can("lead.assign")}
          readFile={(file) => preview.mutateAsync(file)}
          readingFile={preview.isPending}
          startImport={(input) => createImport.mutateAsync(input)}
          starting={createImport.isPending}
          onCancel={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}

function ImportWizard({
  busy,
  canAssign,
  readFile,
  readingFile,
  startImport,
  starting,
  onCancel,
}: {
  busy: boolean;
  canAssign: boolean;
  readFile: (file: File) => Promise<ImportPreview>;
  readingFile: boolean;
  startImport: ReturnType<typeof useCreateLeadImport>["mutateAsync"];
  starting: boolean;
  onCancel: () => void;
}) {
  const closeCreateDialog = useImportUiStore((s) => s.closeCreateDialog);
  const openJobDetail = useImportUiStore((s) => s.openJobDetail);

  const [step, setStep] = useState<ImportWizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [defaults, setDefaults] = useState<ImportDefaults>({});
  const [policy, setPolicy] = useState<ImportDuplicatePolicy>("SKIP");
  const [error, setError] = useState<string | null>(null);

  const fields = data?.fields ?? [];
  const missing = missingRequiredFields(fields, mapping);

  const selectFile = (next: File | null) => {
    setError(null);
    if (next && !isImportSpreadsheet(next)) {
      setError("Choose a .csv or .xlsx file");
      return;
    }
    if (next && next.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      setError("The file is larger than 25 MB");
      return;
    }
    setFile(next);
    // A different file means a different set of columns.
    setData(null);
  };

  const handleRead = async () => {
    if (!file) return;
    if (data) {
      setStep("map");
      return;
    }
    setError(null);
    try {
      const result = await readFile(file);
      setData(result);
      setMapping({ ...result.suggestedMapping });
      setStep("map");
    } catch (err) {
      setError(
        errorText(err, "We couldn't read this file. Check it and try again."),
      );
    }
  };

  const handleStart = async () => {
    if (!data) return;
    setError(null);
    try {
      const job = await startImport({
        fileAssetId: data.fileAssetId,
        mapping,
        defaults: compactDefaults(defaults),
        duplicatePolicy: policy,
      });
      closeCreateDialog();
      openJobDetail(job.id);
    } catch (err) {
      setError(errorText(err, "The import couldn't start. Try again."));
    }
  };

  const goBack = () => {
    setError(null);
    setStep(step === "review" ? "map" : "upload");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Import leads</DialogTitle>
        <DialogDescription>
          Upload a CSV or Excel file, match its columns, then review and start.
          Processing runs in the background.
        </DialogDescription>
      </DialogHeader>

      <ImportStepIndicator step={step} />

      <div className="min-w-0 space-y-3">
        {step === "upload" ? (
          <ImportUploadStep file={file} busy={busy} onSelect={selectFile} />
        ) : null}

        {step === "map" && data ? (
          <ImportMappingStep
            data={data}
            mapping={mapping}
            missing={missing}
            onChange={setMapping}
          />
        ) : null}

        {step === "review" && data ? (
          <ImportReviewStep
            data={data}
            mapping={mapping}
            defaults={defaults}
            onDefaultsChange={setDefaults}
            policy={policy}
            onPolicyChange={setPolicy}
            canAssign={canAssign}
          />
        ) : null}

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={step === "upload" ? onCancel : goBack}
        >
          {step === "upload" ? "Cancel" : "Back"}
        </Button>

        {step === "upload" ? (
          <Button
            type="button"
            disabled={!file || busy}
            onClick={() => void handleRead()}
          >
            {readingFile ? (
              <>
                <AppIcons.loader className="size-4 animate-spin" />
                Reading file...
              </>
            ) : (
              "Next: match columns"
            )}
          </Button>
        ) : null}

        {step === "map" ? (
          <Button
            type="button"
            disabled={missing.length > 0}
            onClick={() => setStep("review")}
          >
            Next: review
          </Button>
        ) : null}

        {step === "review" ? (
          <Button
            type="button"
            disabled={busy || missing.length > 0}
            onClick={() => void handleStart()}
          >
            {starting ? (
              <>
                <AppIcons.loader className="size-4 animate-spin" />
                Starting...
              </>
            ) : (
              `Import ${formatNumber(data?.totalRows ?? 0)} ${
                data?.totalRows === 1 ? "row" : "rows"
              }`
            )}
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}
