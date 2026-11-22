import { DealStatus, Prisma } from '@crmpro/database';

export const dealSelect = {
  id: true,
  leadId: true,
  unitType: true,
  unitCode: true,
  price: true,
  currency: true,
  downPaymentPct: true,
  paymentPlan: true,
  commissionPct: true,
  commissionAmount: true,
  status: true,
  reservedAt: true,
  contractedAt: true,
  expectedContractAt: true,
  cancelledAt: true,
  cancelReason: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  lead: {
    select: {
      id: true,
      fullName: true,
      assignedUserId: true,
      pipelineStage: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          isClosed: true,
          closeType: true,
        },
      },
    },
  },
  project: { select: { id: true, name: true } },
  agent: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.DealSelect;

export type DealRecord = Prisma.DealGetPayload<{ select: typeof dealSelect }>;

export interface DealResponse {
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
      closeType: string | null;
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
  reservedAt: Date;
  contractedAt: Date | null;
  /** R10: when the contract should be signed (reserved deals). */
  expectedContractAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The live (not cancelled) deal shown on lead lists, the board and the drawer. */
export interface LiveDealSummary {
  id: string;
  status: DealStatus;
  price: number;
  currency: string;
  unitType: string;
  projectName: string | null;
}

const toNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

export function toDealResponse(deal: DealRecord): DealResponse {
  return {
    id: deal.id,
    leadId: deal.leadId,
    lead: {
      id: deal.lead.id,
      fullName: deal.lead.fullName,
      stage: deal.lead.pipelineStage,
    },
    project: deal.project,
    agent: deal.agent,
    createdBy: deal.createdBy,
    unitType: deal.unitType,
    unitCode: deal.unitCode,
    price: Number(deal.price),
    currency: deal.currency,
    downPaymentPct: toNumber(deal.downPaymentPct),
    paymentPlan: deal.paymentPlan,
    commissionPct: toNumber(deal.commissionPct),
    commissionAmount: toNumber(deal.commissionAmount),
    status: deal.status,
    reservedAt: deal.reservedAt,
    contractedAt: deal.contractedAt,
    expectedContractAt: deal.expectedContractAt,
    cancelledAt: deal.cancelledAt,
    cancelReason: deal.cancelReason,
    notes: deal.notes,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

/** price × pct / 100, rounded to cents. */
export function computeCommission(price: number, pct: number): number {
  return Math.round(price * pct) / 100;
}
