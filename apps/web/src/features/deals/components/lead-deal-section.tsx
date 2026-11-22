"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CancelDealDialog,
  ContractDealDialog,
  EditDealDialog,
} from "@/features/deals/components/deal-dialogs";
import { DealStatusBadge } from "@/features/deals/components/deal-status-badge";
import { useLeadDeals } from "@/features/deals/hooks";
import type { Deal } from "@/features/deals/types";
import { formatDealDate, formatMoney } from "@/features/deals/utils/deal-format";
import type { Lead } from "@/features/leads/types";
import { usePermissions } from "@/hooks/use-permissions";

type DealAction = { kind: "edit" | "contract" | "cancel"; deal: Deal } | null;

/**
 * "Deal" card in the lead drawer: the live deal with its actions, then past
 * (cancelled) deals compactly. Renders nothing for a lead that never had one.
 */
export function LeadDealSection({ lead }: { lead: Lead }) {
  const { can } = usePermissions();
  const { data: deals, isLoading } = useLeadDeals(lead.id);
  const [action, setAction] = useState<DealAction>(null);

  if (!can("deal.read")) return null;
  if (isLoading) {
    return lead.liveDeal ? <Skeleton className="h-32 w-full rounded-lg" /> : null;
  }

  const items = deals ?? [];
  const live = items.find((deal) => deal.status !== "CANCELLED") ?? null;
  const past = items.filter((deal) => deal.status === "CANCELLED");
  if (!live && past.length === 0) return null;

  const close = () => setAction(null);

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Deal
      </h3>

      {live ? (
        <LiveDealCard
          deal={live}
          canWrite={can("deal.write")}
          canCancel={can("deal.cancel")}
          onAction={(kind) => setAction({ kind, deal: live })}
        />
      ) : null}

      {past.length > 0 ? (
        <ul className="space-y-1">
          {past.map((deal) => (
            <li
              key={deal.id}
              className="flex items-start gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              <DealStatusBadge status={deal.status} className="mt-px" />
              <span className="min-w-0 flex-1">
                <span className="tabular-nums">{formatMoney(deal.price, deal.currency)}</span>
                {" · "}
                {deal.unitType}
                {deal.project ? ` · ${deal.project.name}` : ""}
                <span className="block truncate">
                  {formatDealDate(deal.cancelledAt)}
                  {deal.cancelReason ? ` — ${deal.cancelReason}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {action?.kind === "edit" ? (
        <EditDealDialog key={action.deal.id} deal={action.deal} lead={lead} onClose={close} />
      ) : null}
      {action?.kind === "contract" ? (
        <ContractDealDialog key={action.deal.id} deal={action.deal} onClose={close} />
      ) : null}
      {action?.kind === "cancel" ? (
        <CancelDealDialog key={action.deal.id} deal={action.deal} onClose={close} />
      ) : null}
    </section>
  );
}

function LiveDealCard({
  deal,
  canWrite,
  canCancel,
  onAction,
}: {
  deal: Deal;
  canWrite: boolean;
  canCancel: boolean;
  onAction: (kind: "edit" | "contract" | "cancel") => void;
}) {
  const unit = [deal.unitType, deal.unitCode].filter(Boolean).join(" · ");
  return (
    <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/[0.04] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold tabular-nums leading-tight">
            {formatMoney(deal.price, deal.currency)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {unit}
            {deal.project ? ` · ${deal.project.name}` : ""}
          </p>
        </div>
        <DealStatusBadge status={deal.status} />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <DealFact label="Agent" value={deal.agent?.name ?? "—"} />
        <DealFact
          label="Commission"
          value={
            deal.commissionAmount !== null
              ? `${formatMoney(deal.commissionAmount, deal.currency)}${
                  deal.commissionPct !== null ? ` (${deal.commissionPct}%)` : ""
                }`
              : "—"
          }
        />
        <DealFact label="Reserved" value={formatDealDate(deal.reservedAt)} />
        {deal.status === "RESERVED" ? (
          <DealFact
            label="Contract expected"
            value={deal.expectedContractAt ? formatDealDate(deal.expectedContractAt) : "Not set"}
          />
        ) : (
          <DealFact label="Contracted" value={formatDealDate(deal.contractedAt)} />
        )}
        {deal.downPaymentPct !== null || deal.paymentPlan ? (
          <div className="col-span-2">
            <DealFact
              label="Payment"
              value={[
                deal.downPaymentPct !== null ? `${deal.downPaymentPct}% down` : null,
                deal.paymentPlan,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </div>
        ) : null}
      </dl>
      {deal.notes ? (
        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{deal.notes}</p>
      ) : null}

      {canWrite || canCancel ? (
        <div className="flex flex-wrap gap-2">
          {canWrite && deal.status === "RESERVED" ? (
            <Button type="button" size="sm" onClick={() => onAction("contract")}>
              <AppIcons.contract className="size-3.5" />
              Mark contracted
            </Button>
          ) : null}
          {canWrite && deal.status === "RESERVED" && !deal.expectedContractAt ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onAction("edit")}>
              <AppIcons.today className="size-3.5" />
              Set contract date
            </Button>
          ) : canWrite ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onAction("edit")}>
              <AppIcons.edit className="size-3.5" />
              Edit
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onAction("cancel")}
            >
              Cancel deal
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DealFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
