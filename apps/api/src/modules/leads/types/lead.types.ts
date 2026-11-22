import {
  ContactChannelPreference,
  ContactTimePreference,
  InterestLevel,
  LeadHeat,
  PaymentPreference,
  PurchasePurpose,
  LeadStatus,
  PipelineCloseType,
} from '@crmpro/database';
import type { LiveDealSummary } from '../../deals/deal.mapper';

export interface LeadSourceSummary {
  id: string;
  name: string;
}

export interface LeadPipelineSummary {
  id: string;
  name: string;
}

export interface LeadStageSummary {
  id: string;
  name: string;
  isClosed: boolean;
  closeType: PipelineCloseType | null;
  color: string | null;
  icon: string | null;
}

export interface LeadAssigneeSummary {
  id: string;
  name: string;
}

export interface LeadProjectSummary {
  id: string;
  name: string;
}

export interface LeadProjectInterestResponse {
  projectId: string;
  interestLevel: InterestLevel | null;
  project: LeadProjectSummary;
}

export interface LeadResponse {
  id: string;
  status: LeadStatus;
  fullName: string;
  primaryPhone: string;
  secondaryPhone: string | null;
  email: string | null;
  /** primaryPhone / secondaryPhone / email above are masked. */
  contactMasked: true;
  budgetMin: number | null;
  budgetMax: number | null;
  occupation: string | null;
  residenceArea: string | null;
  paymentPreference: PaymentPreference | null;
  contactChannelPreference: ContactChannelPreference | null;
  contactTimePreference: ContactTimePreference | null;
  purchasePurpose: PurchasePurpose | null;
  lastContactedAt: Date | null;
  firstContactedAt: Date | null;
  stageEnteredAt: Date;
  closedAt: Date | null;
  /** Earliest open task; null on an open lead = no next step. */
  nextTaskDueAt: Date | null;
  contactAttempts: number;
  unansweredStreak: number;
  heat: LeadHeat;
  lostReason: { id: string; name: string } | null;
  lostNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  source: LeadSourceSummary | null;
  pipeline: LeadPipelineSummary;
  stage: LeadStageSummary;
  assignee: LeadAssigneeSummary | null;
  projectInterests: LeadProjectInterestResponse[];
  /** The live (reserved or contracted) deal, if the lead is won. */
  liveDeal: LiveDealSummary | null;
}

/** A possible duplicate; leads outside the actor's scope only show their assignee. */
export interface DuplicateMatch {
  id: string | null;
  fullName: string | null;
  assigneeName: string | null;
  visible: boolean;
}

export interface DuplicateWarning {
  detected: true;
  matches: DuplicateMatch[];
}

export interface LeadMutationResult {
  lead: LeadResponse;
  duplicateWarning: DuplicateWarning | null;
}

export interface LeadActivityResponse {
  id: string;
  tenantId: string;
  leadId: string;
  actorUserId: string | null;
  eventType: string;
  metadata: unknown;
  createdAt: Date;
}

export interface LeadWorkflowResult {
  lead: LeadResponse;
  activity: LeadActivityResponse;
}

export interface LeadNoteAuthorSummary {
  id: string;
  email: string;
}

export interface LeadNoteResponse {
  id: string;
  content: string;
  author: LeadNoteAuthorSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivityActorSummary {
  id: string;
  email: string;
}

export interface LeadTimelineActivityResponse {
  id: string;
  eventType: string;
  metadata: unknown;
  actor: LeadActivityActorSummary | null;
  createdAt: Date;
}

export interface ImportLeadProfile {
  occupation?: string;
  residenceArea?: string;
  paymentPreference?: PaymentPreference;
  contactChannelPreference?: ContactChannelPreference;
  contactTimePreference?: ContactTimePreference;
  purchasePurpose?: PurchasePurpose;
  budgetMin?: number;
  budgetMax?: number;
}

export interface ImportLeadRowInput {
  profile?: ImportLeadProfile;
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string | null;
  email?: string | null;
  sourceId?: string | null;
  assignedUserId?: string | null;
}

export interface DefaultPipelinePlacement {
  pipelineId: string;
  pipelineStageId: string;
}

export type ImportLeadRowResult =
  | { success: true; leadId: string }
  | { success: false; reason: string };

/** A lead created by the system (import row, inbound integration). */
export interface SystemLeadInput extends ImportLeadRowInput {
  /** Projects the client is interested in (unknown ids fail the row). */
  projectIds?: string[];
  /** Free text from the form/file, kept on the creation timeline entry. */
  message?: string | null;
  /** Caller's id for idempotency (inbound integrations). */
  externalId?: string | null;
}

export interface SystemLeadOptions {
  origin: 'import' | 'inbound';
  /** The importing user; null for integrations. */
  actorUserId: string | null;
  importJobId?: string;
  /** 1-based data row: (importJobId, importRowNumber) makes retries safe. */
  importRowNumber?: number;
  /** SKIP (default): a lead with the same phone stops the row. */
  duplicatePolicy?: 'SKIP' | 'CREATE';
  /** Extra metadata for the LEAD_CREATED timeline entry. */
  metadata?: Record<string, unknown>;
}

export type SystemLeadResult =
  | { status: 'created'; leadId: string }
  /** Same import row or externalId seen before: nothing new was created. */
  | { status: 'already-created'; leadId: string }
  /** A lead with this phone exists (open ones preferred). */
  | {
      status: 'duplicate';
      existingLeadId: string;
      existingAssigneeId: string | null;
      existingIsOpen: boolean;
    }
  | { status: 'failed'; reason: string };

export interface LeadListFilters {
  id?: string;
  pipelineId?: string;
  stageId?: string;
  sourceId?: string;
  assignedUserId?: string;
  status?: LeadStatus;
  projectId?: string;
  search?: string;
  unassignedOnly?: boolean;
  staleOnly?: boolean;
  openOnly?: boolean;
  /** Manager filters (workflow spec §3.5). `'unassigned'` = no owner. */
  assignees?: string[];
  stageIds?: string[];
  sourceIds?: string[];
  heat?: LeadHeat[];
  interestLevel?: InterestLevel;
  createdFrom?: Date;
  createdTo?: Date;
  lastContact?: LeadLastContactFilter;
  nextStep?: LeadNextStepFilter;
  /** Required for `nextStep: 'today'` / `slaBreached` — the tenant's local day. */
  todayBounds?: { start: Date; end: Date };
  /** First-contact SLA missed today (tenant day). */
  slaBreached?: LeadSlaBreachedFilter;
  /** Open and in the stage longer than its `stuckAfterDays` (R9). */
  stuck?: boolean;
  /** Open with no contact for the stage's `staleAfterDays` (R8). */
  stageStale?: boolean;
  /** Has an owner. */
  assignedOnly?: boolean;
  /** Required for `stuck` / `stageStale`; missing = no stage has the rule. */
  stageThresholds?: LeadStageThresholds;
  unansweredMin?: number;
  lostReasonId?: string;
  budgetMin?: number;
  budgetMax?: number;
  paymentPreferences?: PaymentPreference[];
  contactChannelPreferences?: ContactChannelPreference[];
  purchasePurposes?: PurchasePurpose[];
  residenceArea?: string;
  occupation?: string;
}

export const LEAD_LAST_CONTACT_FILTERS = [
  'never',
  'over_2d',
  'over_3d',
  'over_7d',
  'over_14d',
  'over_30d',
] as const;
export type LeadLastContactFilter = (typeof LEAD_LAST_CONTACT_FILTERS)[number];

export const LEAD_NEXT_STEP_FILTERS = [
  'overdue',
  'today',
  'none',
  'scheduled',
] as const;
export type LeadNextStepFilter = (typeof LEAD_NEXT_STEP_FILTERS)[number];

export const LEAD_SLA_BREACHED_FILTERS = ['today'] as const;
export type LeadSlaBreachedFilter = (typeof LEAD_SLA_BREACHED_FILTERS)[number];

/** A stage and its R8/R9 threshold in days. */
export interface LeadStageThreshold {
  id: string;
  days: number;
}

export interface LeadStageThresholds {
  stuck: LeadStageThreshold[];
  stale: LeadStageThreshold[];
}

export interface LeadExportParams extends LeadListFilters {
  sortBy?: string;
  sortOrder?: string;
}
