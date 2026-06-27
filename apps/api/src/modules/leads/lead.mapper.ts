import { Prisma } from '@prisma/client';
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
  lastContactedAt: true,
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
    },
  },
  assignedUser: {
    select: {
      id: true,
      name: true,
    },
  },
  leadProjectInterests: {
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
} satisfies Prisma.LeadSelect;

export type LeadRecord = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

export function toLeadResponse(lead: LeadRecord): LeadResponse {
  return {
    id: lead.id,
    status: lead.status,
    fullName: lead.fullName,
    primaryPhone: lead.primaryPhone,
    secondaryPhone: lead.secondaryPhone,
    email: lead.email,
    lastContactedAt: lead.lastContactedAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    source: lead.source,
    pipeline: lead.pipeline,
    stage: lead.pipelineStage,
    assignee: lead.assignedUser,
    projectInterests: lead.leadProjectInterests.map((interest) => ({
      projectId: interest.projectId,
      interestLevel: interest.interestLevel,
      project: interest.project,
    })),
  };
}
