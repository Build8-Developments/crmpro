"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Deal, DealDetailsInput, UpdateDealInput } from "@/features/deals/types";
import {
  computeCommission,
  formatAmountInput,
  formatMoney,
  parseAmount,
  UNIT_TYPE_SUGGESTIONS,
} from "@/features/deals/utils/deal-format";

/** Form state: inputs as strings, "" = not set. */
export interface DealDraft {
  projectId: string;
  unitType: string;
  unitCode: string;
  price: string;
  downPaymentPct: string;
  paymentPlan: string;
  commissionPct: string;
  /** "" = follow price × commission %. */
  commissionAmount: string;
  /** "" = the lead owner. */
  agentId: string;
}

export function emptyDealDraft(projectId = ""): DealDraft {
  return {
    projectId,
    unitType: "",
    unitCode: "",
    price: "",
    downPaymentPct: "",
    paymentPlan: "",
    commissionPct: "",
    commissionAmount: "",
    agentId: "",
  };
}

const text = (value: number | null) => (value === null ? "" : String(value));

export function dealDraftFromDeal(deal: Deal): DealDraft {
  const autoAmount =
    deal.commissionPct !== null && deal.commissionAmount !== null
      ? computeCommission(deal.price, deal.commissionPct) === deal.commissionAmount
      : false;
  return {
    projectId: deal.project?.id ?? "",
    unitType: deal.unitType,
    unitCode: deal.unitCode ?? "",
    price: String(deal.price),
    downPaymentPct: text(deal.downPaymentPct),
    paymentPlan: deal.paymentPlan ?? "",
    commissionPct: text(deal.commissionPct),
    // A typed-by-hand amount stays; one that matches the % stays automatic.
    commissionAmount: autoAmount ? "" : text(deal.commissionAmount),
    agentId: deal.agent?.id ?? "",
  };
}

function percent(value: string): number | null {
  const parsed = parseAmount(value);
  return parsed === null ? null : parsed;
}

/** First problem with the draft, or null when it can be saved. */
export function dealDraftError(draft: DealDraft): string | null {
  if (!draft.unitType.trim()) return "Add the unit type";
  const price = parseAmount(draft.price);
  if (price === null || price <= 0) return "Add the price";
  const down = percent(draft.downPaymentPct);
  if (down !== null && down > 100) return "Down payment is a percentage (0–100)";
  const commission = percent(draft.commissionPct);
  if (commission !== null && commission > 100) {
    return "Commission is a percentage (0–100)";
  }
  return null;
}

/** The commission that will be saved: typed amount, else price × %. */
export function resolvedCommission(draft: DealDraft): number | null {
  const typed = parseAmount(draft.commissionAmount);
  if (typed !== null) return typed;
  const price = parseAmount(draft.price);
  const pct = percent(draft.commissionPct);
  return price !== null && pct !== null ? computeCommission(price, pct) : null;
}

/** Draft → `deal` payload of a move to Won (blank optional fields omitted). */
export function dealDraftToCreateInput(draft: DealDraft): DealDetailsInput {
  const down = percent(draft.downPaymentPct);
  const pct = percent(draft.commissionPct);
  const amount = parseAmount(draft.commissionAmount);
  return {
    projectId: draft.projectId || undefined,
    unitType: draft.unitType.trim(),
    unitCode: draft.unitCode.trim() || undefined,
    price: parseAmount(draft.price) ?? 0,
    downPaymentPct: down ?? undefined,
    paymentPlan: draft.paymentPlan.trim() || undefined,
    commissionPct: pct ?? undefined,
    commissionAmount: amount ?? undefined,
    agentId: draft.agentId || undefined,
  };
}

/** Draft → PATCH body (blank = null so edits can clear values). */
export function dealDraftToUpdateInput(
  draft: DealDraft,
  options: { canChangeAgent: boolean },
): UpdateDealInput {
  const pct = percent(draft.commissionPct);
  return {
    projectId: draft.projectId || null,
    unitType: draft.unitType.trim(),
    unitCode: draft.unitCode.trim() || null,
    price: parseAmount(draft.price) ?? undefined,
    downPaymentPct: percent(draft.downPaymentPct),
    paymentPlan: draft.paymentPlan.trim() || null,
    commissionPct: pct,
    // Blank amount follows the % (or clears when there is no %).
    commissionAmount:
      parseAmount(draft.commissionAmount) ?? (pct === null ? null : undefined),
    ...(options.canChangeAgent && draft.agentId ? { agentId: draft.agentId } : {}),
  };
}

export interface DealProjectOptions {
  /** The lead's project interests, offered first. */
  interested: Array<{ id: string; name: string }>;
  others: Array<{ id: string; name: string }>;
}

interface DealFieldsProps {
  value: DealDraft;
  onChange: (next: DealDraft) => void;
  projects: DealProjectOptions;
  /**
   * Only for people with lead.assign; omitted = the lead owner gets it.
   * `ownerDefault` offers "Lead owner" as the blank choice (new deals).
   */
  agents?: {
    options: Array<{ id: string; name: string }>;
    ownerName: string | null;
    ownerDefault: boolean;
  };
  currency?: string;
}

const NO_PROJECT = "__none__";
const OWNER = "__owner__";

/** Deal details form: required unit type + price, the rest optional. */
export function DealFields({
  value,
  onChange,
  projects,
  agents,
  currency = "EGP",
}: DealFieldsProps) {
  const id = useId();
  const set = (key: keyof DealDraft) => (next: string) =>
    onChange({ ...value, [key]: next });

  const autoCommission =
    value.commissionAmount === "" ? resolvedCommission(value) : null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Project</Label>
        <Select
          value={value.projectId || NO_PROJECT}
          onValueChange={(next) => set("projectId")(next === NO_PROJECT ? "" : next)}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Choose the project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PROJECT}>No project</SelectItem>
            {projects.interested.length > 0 ? (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Client is interested in</SelectLabel>
                  {projects.interested.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            ) : null}
            {projects.others.length > 0 ? (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>All projects</SelectLabel>
                  {projects.others.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-unit-type`}>Unit type</Label>
          <Input
            id={`${id}-unit-type`}
            list={`${id}-unit-types`}
            value={value.unitType}
            onChange={(event) => set("unitType")(event.target.value)}
            placeholder="e.g. Apartment"
            maxLength={100}
            autoComplete="off"
          />
          <datalist id={`${id}-unit-types`}>
            {UNIT_TYPE_SUGGESTIONS.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-unit-code`}>Unit code (optional)</Label>
          <Input
            id={`${id}-unit-code`}
            value={value.unitCode}
            onChange={(event) => set("unitCode")(event.target.value)}
            placeholder="e.g. B12-304"
            maxLength={50}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-price`}>Price ({currency})</Label>
        <Input
          id={`${id}-price`}
          inputMode="decimal"
          value={formatAmountInput(value.price)}
          onChange={(event) => set("price")(event.target.value)}
          placeholder="e.g. 5,250,000"
          className="tabular-nums"
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-down`}>Down payment % (optional)</Label>
          <Input
            id={`${id}-down`}
            inputMode="decimal"
            value={value.downPaymentPct}
            onChange={(event) => set("downPaymentPct")(event.target.value.replace(/[^\d.]/g, ""))}
            placeholder="e.g. 10"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-plan`}>Payment plan (optional)</Label>
          <Input
            id={`${id}-plan`}
            value={value.paymentPlan}
            onChange={(event) => set("paymentPlan")(event.target.value)}
            placeholder="e.g. 8 years quarterly"
            maxLength={500}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-commission-pct`}>Commission % (optional)</Label>
          <Input
            id={`${id}-commission-pct`}
            inputMode="decimal"
            value={value.commissionPct}
            onChange={(event) => set("commissionPct")(event.target.value.replace(/[^\d.]/g, ""))}
            placeholder="e.g. 2.5"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-commission-amount`}>Commission ({currency})</Label>
          <Input
            id={`${id}-commission-amount`}
            inputMode="decimal"
            value={formatAmountInput(value.commissionAmount)}
            onChange={(event) => set("commissionAmount")(event.target.value)}
            placeholder={
              autoCommission !== null ? formatAmountInput(String(autoCommission)) : "Optional"
            }
            className="tabular-nums"
            autoComplete="off"
          />
        </div>
      </div>
      {autoCommission !== null ? (
        <p className="-mt-1.5 text-xs text-muted-foreground">
          Commission {formatMoney(autoCommission, currency)} — price × {value.commissionPct}%.
          Type an amount to override.
        </p>
      ) : null}

      {agents ? (
        <div className="space-y-1.5">
          <Label>Credited to</Label>
          <Select
            value={value.agentId || OWNER}
            onValueChange={(next) => set("agentId")(next === OWNER ? "" : next)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Lead owner" />
            </SelectTrigger>
            <SelectContent>
              {agents.ownerDefault ? (
                <SelectItem value={OWNER}>
                  {agents.ownerName ? `Lead owner (${agents.ownerName})` : "Lead owner"}
                </SelectItem>
              ) : null}
              {agents.options.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
