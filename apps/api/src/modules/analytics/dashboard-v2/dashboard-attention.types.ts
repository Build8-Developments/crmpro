/**
 * Leads-list query parameters (`/leads?…`) that show exactly the leads behind
 * a number. Built from the same where-fragments as the count
 * (leads/utils/lead-filter-where.util.ts).
 */
export type LeadsListQuery = Record<string, string>;

export interface AttentionAgentRow {
  userId: string;
  name: string;
  /** Leads behind the link. */
  leadCount: number;
  listQuery: LeadsListQuery;
}

export interface AttentionOverdueAgentRow extends AttentionAgentRow {
  /** Open tasks past due (lead-less tasks included). */
  taskCount: number;
  oldestDueAt: string;
}

export interface AttentionStageRow {
  stageId: string;
  stageName: string;
  pipelineName: string;
  thresholdDays: number;
  count: number;
  listQuery: LeadsListQuery;
}

export interface AttentionStageGroup {
  count: number;
  listQuery: LeadsListQuery;
  /** Stages with the rule on; 0 means the rule is off everywhere. */
  stagesConfigured: number;
  byStage: AttentionStageRow[];
}

export const NUDGE_KINDS = ['overdue_tasks', 'hot_untouched'] as const;
export type NudgeKind = (typeof NUDGE_KINDS)[number];

/** GET /analytics/v2/attention — spec §5.1. */
export interface DashboardAttentionResponse {
  /** These are live numbers: the dashboard period does not apply to them. */
  periodApplies: false;
  generatedAt: string;
  timeZone: string;
  /** First-contact SLA breaches whose breach happened today (workspace day). */
  slaBreachesToday: { count: number; listQuery: LeadsListQuery };
  /**
   * Open tasks past due, per assignee (top agents by task count). The links
   * show the leads whose next step is overdue (`leadCount`).
   */
  overdueTasks: {
    taskCount: number;
    leadCount: number;
    agentCount: number;
    listQuery: LeadsListQuery;
    byAgent: AttentionOverdueAgentRow[];
  };
  /** Open HOT leads not contacted for `hours` (or never). */
  hotUntouched: {
    hours: number;
    count: number;
    listQuery: LeadsListQuery;
    byAgent: AttentionAgentRow[];
  };
  /** Open, assigned leads without an open task (R7). */
  noNextStep: { count: number; listQuery: LeadsListQuery };
  /** Open leads in their stage longer than the stage's stuck days (R9). */
  stuck: AttentionStageGroup;
  /** Open leads not contacted for the stage's stale days (R8). */
  stale: AttentionStageGroup;
  /** Open leads without an owner, and since when the oldest is waiting. */
  unassigned: {
    count: number;
    oldestCreatedAt: string | null;
    listQuery: LeadsListQuery;
  };
}

export interface NudgeAgentResult {
  sent: boolean;
  /** Why nothing was sent. */
  reason: 'ALREADY_NUDGED' | 'NOTHING_TO_NUDGE' | null;
  kind: NudgeKind;
  userId: string;
  /** Overdue tasks / untouched hot leads the agent has right now. */
  count: number;
  /** When this agent can be nudged about this again. */
  nextAllowedAt: string | null;
}
