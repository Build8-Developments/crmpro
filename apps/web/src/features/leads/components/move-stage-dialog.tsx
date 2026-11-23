"use client";

import { useMemo, useState } from "react";
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
import { useLead, useLeadFilterOptions } from "@/features/leads/hooks";
import { useBulkMoveLeadsStage, useMoveLeadStage } from "@/features/leads/mutations";
import { useLeadsTableStore } from "@/features/leads/stores/leads-table-store";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { Input } from "@/components/ui/input";
import { useNow } from "@/hooks/use-now";
import { usePermissions } from "@/hooks/use-permissions";
import { formatMoney, formatNumber } from "@/lib/format";
import { StageColorDot } from "@/features/leads/utils/stage-color";
import { LostReasonFields } from "./lost-reason-fields";
import {
  DealFields,
  dealDraftError,
  dealDraftToCreateInput,
  emptyDealDraft,
  type DealDraft,
} from "@/features/deals/components/deal-fields";
import { useDealFormOptions } from "@/features/deals/components/use-deal-form-options";
import { useOrganization } from "@/features/organization/hooks";
import {
  dayToIso,
  toDateInputValue,
} from "@/features/deals/utils/deal-format";

export function MoveStageDialog() {
  const moveStageDialog = useLeadUiStore((s) => s.moveStageDialog);
  const closeMoveStageDialog = useLeadUiStore((s) => s.closeMoveStageDialog);
  const clearRowSelection = useLeadsTableStore((s) => s.clearRowSelection);
  const { pipelines } = useLeadFilterOptions();
  const moveStage = useMoveLeadStage();
  const bulkMoveStage = useBulkMoveLeadsStage();
  const { can } = usePermissions();
  const [pickedStageId, setStageId] = useState<string>();
  const stageId = pickedStageId ?? moveStageDialog?.stageId;
  const [lostReasonId, setLostReasonId] = useState<string>();
  const [lostNote, setLostNote] = useState("");
  // null = untouched: starts from the lead's first project interest.
  const [dealDraft, setDealDraft] = useState<DealDraft | null>(null);
  // Optional: when the contract should be signed (drives the paperwork task).
  const [expectedContractDay, setExpectedContractDay] = useState("");
  const now = useNow();
  // Deals are recorded in the workspace currency (Settings → General).
  const { data: organization } = useOrganization();
  const currency = organization?.settings.currency;

  const open = Boolean(moveStageDialog);
  const leadIds = moveStageDialog?.leadIds ?? [];
  const matching = moveStageDialog?.matching;
  const pipelineId = moveStageDialog?.pipelineId;
  const count = matching?.count ?? leadIds.length;
  const isBulk = Boolean(matching) || leadIds.length > 1;
  const pending = moveStage.isPending || bulkMoveStage.isPending;

  const stageOptions = useMemo(() => {
    if (!pipelineId) return [];
    return (
      pipelines.data
        ?.find((pipeline) => pipeline.id === pipelineId)
        ?.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color,
          closeType: stage.closeType,
        })) ?? []
    );
  }, [pipelineId, pipelines.data]);

  const targetStage = stageOptions.find((stage) => stage.id === stageId);
  const needsReason = targetStage?.closeType === "LOST";
  const isWon = targetStage?.closeType === "WON";

  // Winning records a deal, so it needs the single lead (project interests,
  // owner, any live deal).
  const singleLeadId = isBulk ? undefined : leadIds[0];
  const { data: lead } = useLead(singleLeadId);
  const liveDeal = lead?.liveDeal ?? null;
  const { projectOptions, agents } = useDealFormOptions(lead, true);
  const draft = dealDraft ?? emptyDealDraft(lead?.projectInterests[0]?.projectId ?? "");
  // Won → another Won stage keeps the live deal; no new details needed.
  const needsDeal = isWon && !isBulk && !liveDeal;
  const dealError = needsDeal ? dealDraftError(draft) : null;
  // A live deal pins the lead to Won until the deal is cancelled.
  const blockedByDeal = Boolean(liveDeal) && Boolean(targetStage) && !isWon;
  const blockedBulkWin = isWon && isBulk;
  const canRecordDeal = can("deal.write");

  const canSubmit =
    Boolean(stageId) &&
    (!needsReason || Boolean(lostReasonId)) &&
    !blockedByDeal &&
    !blockedBulkWin &&
    (!needsDeal || (canRecordDeal && Boolean(lead) && !dealError));

  const handleClose = () => {
    closeMoveStageDialog();
    setStageId(undefined);
    setLostReasonId(undefined);
    setLostNote("");
    setDealDraft(null);
    setExpectedContractDay("");
  };

  const handleSubmit = async () => {
    if (!stageId) return;
    const lost = needsReason
      ? { lostReasonId, lostNote: lostNote.trim() || undefined }
      : undefined;
    const deal = needsDeal
      ? {
          ...dealDraftToCreateInput(draft),
          expectedContractAt: dayToIso(expectedContractDay, now) ?? undefined,
        }
      : undefined;
    try {
      if (matching) {
        await bulkMoveStage.mutateAsync({
          selection: { filters: matching.filters },
          targetStageId: stageId,
          lost,
        });
        clearRowSelection();
      } else if (isBulk) {
        await bulkMoveStage.mutateAsync({ selection: { leadIds }, targetStageId: stageId, lost });
        clearRowSelection();
      } else if (leadIds[0]) {
        await moveStage.mutateAsync({ leadId: leadIds[0], pipelineStageId: stageId, lost, deal });
      }
      handleClose();
    } catch {
      // Error toast is handled by useApiMutation
    }
  };

  if (!can("lead.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent
        className={needsDeal ? "max-h-[90dvh] overflow-y-auto sm:max-w-md" : "sm:max-w-sm"}
      >
        <DialogHeader>
          <DialogTitle>
            {isBulk ? `Move ${formatNumber(count)} leads` : "Move stage"}
          </DialogTitle>
          <DialogDescription>
            {matching
              ? "Every lead matching the current filters moves to this stage."
              : `Pick the stage for ${isBulk ? "the selected leads" : "this lead"}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <span className="inline-flex items-center gap-2">
                      <StageColorDot color={stage.color} />
                      {stage.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsReason ? (
            <LostReasonFields
              reasonId={lostReasonId}
              note={lostNote}
              onReasonChange={setLostReasonId}
              onNoteChange={setLostNote}
            />
          ) : null}

          {blockedBulkWin ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
              Win leads one at a time so each deal is recorded.
            </p>
          ) : null}

          {blockedByDeal && liveDeal ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
              This lead has an active deal ({formatMoney(liveDeal.price, liveDeal.currency)}).
              Cancel the deal from the lead first — that re-opens it.
            </p>
          ) : null}

          {isWon && !isBulk && liveDeal ? (
            <p className="text-xs text-muted-foreground">
              The lead keeps its current deal ({formatMoney(liveDeal.price, liveDeal.currency)}).
            </p>
          ) : null}

          {needsDeal ? (
            canRecordDeal ? (
              <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/[0.04] p-3 motion-safe:animate-slide-in [--slide:-4px]">
                <div>
                  <p className="text-sm font-medium">Deal details</p>
                  <p className="text-xs text-muted-foreground">
                    Project, unit type and price are what the sales reports read.
                  </p>
                </div>
                <DealFields
                  value={draft}
                  onChange={setDealDraft}
                  projects={projectOptions}
                  agents={agents}
                  currency={currency}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="win-expected-contract-at">
                    Contract expected on <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="win-expected-contract-at"
                    type="date"
                    min={toDateInputValue(new Date(now))}
                    value={expectedContractDay}
                    onChange={(event) => setExpectedContractDay(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Managers are alerted if the contract isn&apos;t signed by then.
                  </p>
                </div>
                {dealError ? (
                  <p className="text-xs text-muted-foreground">{dealError}</p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
                You can&apos;t record deals, so you can&apos;t win leads. Ask a manager.
              </p>
            )
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={pending || !canSubmit}
          >
            {pending ? "Saving…" : needsDeal ? "Win lead" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
