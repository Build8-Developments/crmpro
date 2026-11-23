import { DealStatus, Prisma } from '@crmpro/database';
import { maskEmail, maskPhone } from '@crmpro/shared/leads';
import type { LiveDealSummary } from '../deals/deal.mapper';
import { toStoredCustomFields } from '../custom-fields/custom-field-values';
import { LeadResponse } from './types/lead.types';

export const leadSelect = {
  id: true,
  status: true,
  fullName: true,
  primaryPhone: true,
  primaryPhoneNormalized: true,
  secondaryPhone: true,
  secondaryPhoneNormalized: true,
  email: true,
  budgetMin: true,
  budgetMax: true,
  occupation: true,
  residenceArea: true,
  paymentPreference: true,
  contactChannelPreference: true,
  contactTimePreference: true,
  purchasePurpose: true,
  customFields: true,
  lastContactedAt: true,
  firstContactedAt: true,
  stageEnteredAt: true,
  closedAt: true,
  nextTaskDueAt: true,
  contactAttempts: true,
  unansweredStreak: true,
  heat: true,
  lostNote: true,
  lostReason: {
    select: {
      id: true,
      name: true,
    },
  },
  createdAt: true,
  updatedAt: true,
  source: {
    select: {
      id: true,
      name: true,
    },
  },
  pipeline: {
    select: {
      id: true,
      name: true,
    },
  },
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
  assignedUser: {
    select: {
      id: true,
      name: true,
    },
  },
  leadProjectInterests: {
    orderBy: { createdAt: 'asc' },
    select: {
      projectId: true,
      interestLevel: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  // At most one live (not cancelled) deal per lead — partial unique index.
  deals: {
    where: { status: { not: DealStatus.CANCELLED } },
    take: 1,
    select: {
      id: true,
      status: true,
      price: true,
      currency: true,
      unitType: true,
      project: { select: { name: true } },
    },
  },
} satisfies Prisma.LeadSelect;

export type LeadRecord = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

export function toLeadResponse(lead: LeadRecord): LeadResponse {
  return {
    id: lead.id,
    status: lead.status,
    fullName: lead.fullName,
    // Masked by default; real values come from the logged contact-access
    // endpoint (POST /leads/:id/contact-access).
    primaryPhone: maskPhone(lead.primaryPhone),
    secondaryPhone: lead.secondaryPhone ? maskPhone(lead.secondaryPhone) : null,
    email: lead.email ? maskEmail(lead.email) : null,
    contactMasked: true,
    budgetMin: lead.budgetMin === null ? null : Number(lead.budgetMin),
    budgetMax: lead.budgetMax === null ? null : Number(lead.budgetMax),
    occupation: lead.occupation,
    residenceArea: lead.residenceArea,
    paymentPreference: lead.paymentPreference,
    contactChannelPreference: lead.contactChannelPreference,
    contactTimePreference: lead.contactTimePreference,
    purchasePurpose: lead.purchasePurpose,
    // As stored: archived fields' values are included (the UI greys them).
    customFields: toStoredCustomFields(lead.customFields),
    lastContactedAt: lead.lastContactedAt,
    firstContactedAt: lead.firstContactedAt,
    stageEnteredAt: lead.stageEnteredAt,
    closedAt: lead.closedAt,
    nextTaskDueAt: lead.nextTaskDueAt,
    contactAttempts: lead.contactAttempts,
    unansweredStreak: lead.unansweredStreak,
    heat: lead.heat,
    lostReason: lead.lostReason,
    lostNote: lead.lostNote,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    source: lead.source,
    pipeline: lead.pipeline,
    stage: {
      id: lead.pipelineStage.id,
      name: lead.pipelineStage.name,
      color: lead.pipelineStage.color,
      icon: lead.pipelineStage.icon,
      isClosed: lead.pipelineStage.isClosed,
      closeType: lead.pipelineStage.closeType,
    },
    assignee: lead.assignedUser,
    projectInterests: lead.leadProjectInterests.map((interest) => ({
      projectId: interest.projectId,
      interestLevel: interest.interestLevel,
      project: interest.project,
    })),
    // Optional chain: hand-built records (tests, partial selects) may omit it.
    liveDeal: toLiveDealSummary(lead.deals?.[0]),
  };
}

function toLiveDealSummary(
  deal: LeadRecord['deals'][number] | undefined,
): LiveDealSummary | null {
  if (!deal) return null;
  return {
    id: deal.id,
    status: deal.status,
    price: Number(deal.price),
    currency: deal.currency,
    unitType: deal.unitType,
    projectName: deal.project?.name ?? null,
  };
}
