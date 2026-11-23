import type { LiveDealSummary } from "@/features/deals/types";
import type {
  ContactAccessAction,
  ContactChannelPreference,
  ContactField,
  ContactTimePreference,
  InteractionChannel,
  InteractionOutcome,
  LeadHeat,
  LeadMergeField,
  LeadMergeFieldChoice,
  PaymentPreference,
  PurchasePurpose,
  TaskPriority,
  TaskType,
} from "@crmpro/shared";
import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type {
  ContactAccessAction,
  ContactChannelPreference,
  ContactField,
  ContactTimePreference,
  InteractionChannel,
  InteractionOutcome,
  LeadHeat,
  LeadMergeField,
  LeadMergeFieldChoice,
  PaymentPreference,
  PurchasePurpose,
  TaskPriority,
  TaskType,
};

/** Client profile fields (create, update, display). */
export interface LeadProfile {
  occupation: string | null;
  residenceArea: string | null;
  paymentPreference: PaymentPreference | null;
  contactChannelPreference: ContactChannelPreference | null;
  contactTimePreference: ContactTimePreference | null;
  purchasePurpose: PurchasePurpose | null;
  budgetMin: number | null;
  budgetMax: number | null;
}

export type LeadStatus = "OPEN" | "ARCHIVED";

export type PipelineCloseType = "WON" | "LOST" | null;

export type InterestLevel = "LOW" | "MEDIUM" | "HIGH" | "HOT" | null;

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
  closeType: PipelineCloseType;
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

export interface LeadProjectInterest {
  projectId: string;
  interestLevel: InterestLevel;
  project: LeadProjectSummary;
}

export interface Lead extends LeadProfile {
  id: string;
  status: LeadStatus;
  fullName: string;
  primaryPhone: string;
  secondaryPhone: string | null;
  email: string | null;
  /** Phone/email above are masked; real values via accessLeadContact. */
  contactMasked: boolean;
  lastContactedAt: string | null;
  firstContactedAt: string | null;
  stageEnteredAt: string;
  closedAt: string | null;
  /** Earliest open task; null on an open lead means no next step. */
  nextTaskDueAt: string | null;
  contactAttempts: number;
  unansweredStreak: number;
  heat: LeadHeat;
  lostReason: { id: string; name: string } | null;
  lostNote: string | null;
  createdAt: string;
  updatedAt: string;
  source: LeadSourceSummary | null;
  pipeline: LeadPipelineSummary;
  stage: LeadStageSummary;
  assignee: LeadAssigneeSummary | null;
  projectInterests: LeadProjectInterest[];
  /** The live (reserved or contracted) deal of a won lead. */
  liveDeal: LiveDealSummary | null;
  /** Custom field values by key (archived fields' values included). */
  customFields: Record<string, unknown>;
}

export interface CreateLeadInput extends Partial<LeadProfile> {
  secondaryPhone?: string | null;
  fullName: string;
  primaryPhone: string;
  email?: string | null;
  sourceId?: string;
  pipelineId: string;
  pipelineStageId: string;
  assignedUserId?: string;
  projectInterests?: Array<{
    projectId: string;
    interestLevel?: InterestLevel;
  }>;
  /** Custom field values by key; null clears one. */
  customFields?: Record<string, unknown>;
}

/** A possible duplicate; leads outside your visibility only show who handles them. */
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
  lead: Lead;
  duplicateWarning: DuplicateWarning | null;
}

export type CreateLeadResult = LeadMutationResult;

export interface UpdateLeadInput extends Partial<LeadProfile> {
  fullName?: string;
  primaryPhone?: string;
  secondaryPhone?: string | null;
  email?: string | null;
  sourceId?: string | null;
  status?: LeadStatus;
  projectInterests?: Array<{
    projectId: string;
    interestLevel?: InterestLevel;
  }>;
  /** Only the changed custom fields; merged into the stored values. */
  customFields?: Record<string, unknown>;
}

export interface LeadNote {
  id: string;
  content: string;
  author: { id: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface LeadTimelineActivity {
  id: string;
  eventType: string;
  metadata: unknown;
  actor: { id: string; email: string } | null;
  createdAt: string;
}

export interface BulkLeadActionResult {
  successCount: number;
  failureCount: number;
  failures: Array<{ leadId: string; reason: string }>;
}

export interface LeadsListParams extends ListQueryParams {
  id?: string;
  pipelineId?: string;
  stageId?: string;
  sourceId?: string;
  assignedUserId?: string;
  status?: LeadStatus;
  projectId?: string;
  unassignedOnly?: boolean;
  staleOnly?: boolean;
  openOnly?: boolean;
  assignees?: string[];
  stageIds?: string[];
  sourceIds?: string[];
  heat?: LeadHeat[];
  interestLevel?: Exclude<InterestLevel, null>;
  createdFrom?: string;
  createdTo?: string;
  closedFrom?: string;
  closedTo?: string;
  lastContact?: LeadLastContactFilter;
  nextStep?: LeadNextStepFilter;
  slaBreached?: LeadSlaBreachedFilter;
  stuck?: boolean;
  stageStale?: boolean;
  assignedOnly?: boolean;
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

export type LeadLastContactFilter =
  | "never"
  | "over_2d"
  | "over_3d"
  | "over_7d"
  | "over_14d"
  | "over_30d";
/** First-contact SLA missed today (workspace time zone). */
export type LeadSlaBreachedFilter = "today";
export type LeadNextStepFilter = "overdue" | "today" | "none" | "scheduled";

/** Filters for "all leads matching" bulk actions (no paging/sorting). */
export type LeadSelectionFilters = Omit<
  LeadsListParams,
  "page" | "limit" | "sortBy" | "sortOrder"
>;

export type LeadsListResponse = PaginatedResponse<Lead>;

export interface LostReason {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  recyclable: boolean;
  recycleAfterDays: number | null;
  leadCount: number;
}

export type TaskStatus = "OPEN" | "DONE" | "SKIPPED" | "CANCELLED";

export interface LeadTask {
  id: string;
  leadId: string | null;
  type: TaskType;
  title: string;
  dueAt: string;
  /** First-contact tasks: when the manager is alerted. */
  escalateAt?: string | null;
  isAllDay: boolean;
  isOverdue: boolean;
  priority: TaskPriority;
  origin: "SYSTEM" | "SELF" | "MANAGER";
  ruleKey: string | null;
  status: TaskStatus;
  completedAt: string | null;
  skipReason: string | null;
  snoozeCount: number;
  createdAt: string;
  assignee: { id: string; name: string };
  createdBy: { id: string; name: string } | null;
  lead: {
    id: string;
    fullName: string;
    primaryPhone: string;
    heat: LeadHeat;
    stage: { id: string; name: string; color: string | null; icon: string | null };
  } | null;
}

export interface LeadInteraction {
  id: string;
  leadId: string;
  channel: InteractionChannel;
  direction: "OUTBOUND" | "INBOUND";
  outcome: InteractionOutcome;
  durationSeconds: number | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
  user: { id: string; name: string };
  project: { id: string; name: string } | null;
  evidence: Array<{ id: string; originalFilename: string; mimeType: string }>;
}

/** A file attached to a lead; `interaction` is set when it is evidence. */
export interface LeadAttachment {
  id: string;
  category: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: string;
  uploadedBy: { id: string; name: string };
  interaction: {
    id: string;
    channel: InteractionChannel;
    outcome: InteractionOutcome;
    occurredAt: string;
  } | null;
}

export interface LogInteractionInput {
  channel: InteractionChannel;
  outcome: InteractionOutcome;
  direction?: "OUTBOUND" | "INBOUND";
  durationSeconds?: number;
  note?: string;
  projectId?: string;
  taskId?: string;
  /** Files already uploaded to storage (see stageFileUpload). */
  evidence?: Array<{ objectKey: string }>;
  nextStep?: {
    type: TaskType;
    dueAt: string;
    title?: string;
  };
}

export interface LogInteractionResult {
  interaction: LeadInteraction;
  lead: Lead;
  nextTask: LeadTask | null;
  completedTaskIds: string[];
}

/** What hangs off a lead and moves with it when it is merged away. */
export interface LeadMergeCounts {
  interactions: number;
  tasks: number;
  notes: number;
  files: number;
}

/** A live lead you can see that looks like the same person. */
export interface LeadDuplicate extends Lead {
  counts: LeadMergeCounts;
  matchedOn: Array<"phone" | "email">;
  /** Mergeable fields whose real (unmasked) values differ from the lead asked about. */
  differingFields: LeadMergeField[];
}

export interface LeadDuplicatesResponse {
  /** Counts for the lead asked about. */
  counts: LeadMergeCounts;
  items: LeadDuplicate[];
}

export interface MergeLeadsInput {
  /** The lead that survives. */
  targetLeadId: string;
  /** The lead merged into it (soft-deleted afterwards). */
  sourceLeadId: string;
  fields?: Partial<Record<LeadMergeField, LeadMergeFieldChoice>>;
}

export interface LeadMergeResult {
  lead: Lead;
  mergedLeadId: string;
  moved: LeadMergeCounts & { activities: number; projectInterests: number };
  fieldsFromSource: LeadMergeField[];
  secondaryPhoneAdded: boolean;
}
