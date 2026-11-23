import type { PaginatedResponse } from "@/types/pagination";

export type DealStatus = "RESERVED" | "CONTRACTED" | "CANCELLED";

export type DealSortField = "reservedAt" | "contractedAt" | "price";

/** The live (not cancelled) deal carried on every lead payload. */
export interface LiveDealSummary {
  id: string;
  status: Exclude<DealStatus, "CANCELLED">;
  price: number;
  currency: string;
  unitType: string;
  projectName: string | null;
}

export interface Deal {
  id: string;
  leadId: string;
  lead: {
    id: string;
    fullName: string;
    stage: {
      id: string;
      name: string;
      color: string | null;
      icon: string | null;
      isClosed: boolean;
      closeType: "WON" | "LOST" | null;
    };
  };
  project: { id: string; name: string } | null;
  agent: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  unitType: string;
  unitCode: string | null;
  price: number;
  currency: string;
  downPaymentPct: number | null;
  paymentPlan: string | null;
  commissionPct: number | null;
  commissionAmount: number | null;
  status: DealStatus;
  reservedAt: string;
  contractedAt: string | null;
  /** When the contract should be signed (reserved deals). Managers are alerted once it passes. */
  expectedContractAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealTotalsBucket {
  count: number;
  price: number;
  commission: number;
}

export interface DealTotals extends DealTotalsBucket {
  byStatus: Record<DealStatus, DealTotalsBucket>;
}

export interface DealsListResponse extends PaginatedResponse<Deal> {
  totals: DealTotals;
}

export interface DealsListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: DealSortField;
  sortOrder?: "asc" | "desc";
  status?: DealStatus;
  agentId?: string;
  projectId?: string;
  /** ISO dates; `to` is exclusive. */
  from?: string;
  to?: string;
  periodField?: "any" | "reservedAt" | "contractedAt" | "cancelledAt";
  /** Only deals that weren't cancelled. */
  live?: boolean;
}

/** Sent with a move to a Won stage (POST /leads/:id/move-stage `deal`). */
export interface DealDetailsInput {
  projectId?: string;
  unitType: string;
  unitCode?: string | null;
  price: number;
  downPaymentPct?: number;
  paymentPlan?: string | null;
  commissionPct?: number;
  commissionAmount?: number;
  agentId?: string;
  reservedAt?: string;
  expectedContractAt?: string | null;
  notes?: string | null;
}

export interface UpdateDealInput {
  projectId?: string | null;
  unitType?: string;
  unitCode?: string | null;
  price?: number;
  downPaymentPct?: number | null;
  paymentPlan?: string | null;
  commissionPct?: number | null;
  commissionAmount?: number | null;
  agentId?: string | null;
  reservedAt?: string;
  /** Reserved deals only; null clears it. */
  expectedContractAt?: string | null;
  contractedAt?: string;
  notes?: string | null;
}
