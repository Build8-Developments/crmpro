"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  DealFields,
  dealDraftError,
  dealDraftFromDeal,
  dealDraftToUpdateInput,
  type DealDraft,
} from "@/features/deals/components/deal-fields";
import { useDealFormOptions } from "@/features/deals/components/use-deal-form-options";
import { useCancelDeal, useContractDeal, useUpdateDeal } from "@/features/deals/mutations";
import type { Deal } from "@/features/deals/types";
import { dayToIso, formatMoney, toDateInputValue } from "@/features/deals/utils/deal-format";
import type { Lead } from "@/features/leads/types";
import { useNow } from "@/hooks/use-now";

const textareaClass =
  "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] duration-fast ease-enter focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

interface DealDialogProps {
  deal: Deal;
  onClose: () => void;
}

/** Edit a live deal. Mount with `key={deal.id}` so the form starts from it. */
export function EditDealDialog({ deal, lead, onClose }: DealDialogProps & { lead: Lead }) {
  const now = useNow();
  const updateDeal = useUpdateDeal();
  const { projectOptions, agents, canAssign } = useDealFormOptions(lead, false);
  const [draft, setDraft] = useState<DealDraft>(() => dealDraftFromDeal(deal));
  const initialReservedDay = toDateInputValue(new Date(deal.reservedAt));
  const initialContractedDay = deal.contractedAt
    ? toDateInputValue(new Date(deal.contractedAt))
    : "";
  const initialExpectedDay = deal.expectedContractAt
    ? toDateInputValue(new Date(deal.expectedContractAt))
    : "";
  const [reservedDay, setReservedDay] = useState(initialReservedDay);
  const [contractedDay, setContractedDay] = useState(initialContractedDay);
  const [expectedDay, setExpectedDay] = useState(initialExpectedDay);
  const [notes, setNotes] = useState(deal.notes ?? "");
  const error = dealDraftError(draft);
  const today = toDateInputValue(new Date(now));

  const handleSave = async () => {
    if (error) return;
    const reservedAt =
      reservedDay && reservedDay !== initialReservedDay ? dayToIso(reservedDay, now) : undefined;
    const contractedAt =
      deal.status === "CONTRACTED" && contractedDay && contractedDay !== initialContractedDay
        ? dayToIso(contractedDay, now, reservedAt ?? deal.reservedAt)
        : undefined;
    // Blank clears the expected date; only sent when it changed.
    const expectedContractAt =
      deal.status === "RESERVED" && expectedDay !== initialExpectedDay
        ? (dayToIso(expectedDay, now, reservedAt ?? deal.reservedAt) ?? null)
        : undefined;
    try {
      await updateDeal.mutateAsync({
        dealId: deal.id,
        input: {
          ...dealDraftToUpdateInput(draft, { canChangeAgent: canAssign }),
          reservedAt,
          contractedAt,
          expectedContractAt,
          notes: notes.trim() || null,
        },
      });
      onClose();
    } catch {
      // Toast from the mutation.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit deal</DialogTitle>
          <DialogDescription>{lead.fullName}</DialogDescription>
        </DialogHeader>

        <DealFields
          value={draft}
          onChange={setDraft}
          projects={projectOptions}
          agents={agents}
          currency={deal.currency}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="deal-reserved-at">Reserved on</Label>
            <Input
              id="deal-reserved-at"
              type="date"
              max={today}
              value={reservedDay}
              onChange={(event) => setReservedDay(event.target.value)}
            />
          </div>
          {deal.status === "RESERVED" ? (
            <div className="space-y-1.5">
              <Label htmlFor="deal-expected-contract-at">Contract expected on</Label>
              <Input
                id="deal-expected-contract-at"
                type="date"
                min={reservedDay}
                value={expectedDay}
                onChange={(event) => setExpectedDay(event.target.value)}
              />
            </div>
          ) : null}
          {deal.status === "CONTRACTED" ? (
            <div className="space-y-1.5">
              <Label htmlFor="deal-contracted-at">Contract signed on</Label>
              <Input
                id="deal-contracted-at"
                type="date"
                min={reservedDay}
                max={today}
                value={contractedDay}
                onChange={(event) => setContractedDay(event.target.value)}
              />
            </div>
          ) : null}
        </div>

        {deal.status === "RESERVED" ? (
          <p className="-mt-1.5 text-xs text-muted-foreground">
            {expectedDay
              ? "Managers are alerted if the deal is still reserved after this date."
              : "No date yet: managers are alerted 14 days after the reservation."}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="deal-notes">Notes (optional)</Label>
          <textarea
            id="deal-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={2000}
            rows={2}
            className={textareaClass}
          />
        </div>

        {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={Boolean(error) || updateDeal.isPending}
          >
            {updateDeal.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Reserved → contracted, with the signing date (defaults to today). */
export function ContractDealDialog({ deal, onClose }: DealDialogProps) {
  const now = useNow();
  const contractDeal = useContractDeal();
  const today = toDateInputValue(new Date(now));
  const [day, setDay] = useState(today);
  const reservedDay = toDateInputValue(new Date(deal.reservedAt));

  const handleConfirm = async () => {
    try {
      await contractDeal.mutateAsync({
        dealId: deal.id,
        contractedAt: dayToIso(day, now, deal.reservedAt),
      });
      onClose();
    } catch {
      // Toast from the mutation.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as contracted</DialogTitle>
          <DialogDescription>
            {deal.unitType} · {formatMoney(deal.price, deal.currency)}. Contracted deals count
            as revenue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="deal-contract-day">Contract signed on</Label>
          <Input
            id="deal-contract-day"
            type="date"
            min={reservedDay}
            max={today}
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!day || contractDeal.isPending}
          >
            {contractDeal.isPending ? "Saving…" : "Mark contracted"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Cancel needs a reason; the lead re-opens in the stage it was won from. */
export function CancelDealDialog({ deal, onClose }: DealDialogProps) {
  const cancelDeal = useCancelDeal();
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    try {
      await cancelDeal.mutateAsync({ dealId: deal.id, reason: trimmed });
      onClose();
    } catch {
      // Toast from the mutation.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel this deal?</DialogTitle>
          <DialogDescription>
            The lead re-opens in the stage it was in before it was won, and its agent gets it
            back in their follow-ups. The cancelled deal stays in the history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="deal-cancel-reason">Why was it cancelled?</Label>
          <textarea
            id="deal-cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. Client could not get the bank transfer approved"
            className={textareaClass}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Keep deal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={!reason.trim() || cancelDeal.isPending}
          >
            {cancelDeal.isPending ? "Cancelling…" : "Cancel deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
