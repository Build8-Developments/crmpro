/** Mirrors apps/api/.../dashboard-v2/dashboard-attention.types.ts. */

/** `/leads?…` parameters that show the leads behind a number. */
export type LeadsListQuery = Record<string, string>;

export interface AttentionAgentRow {
  userId: string;
  name: string;
  leadCount: number;
  listQuery: LeadsListQuery;
}

export interface AttentionOverdueAgentRow extends AttentionAgentRow {
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
  stagesConfigured: number;
  byStage: AttentionStageRow[];
}

export interface DashboardAttention {
  periodApplies: false;
  generatedAt: string;
  timeZone: string;
  slaBreachesToday: { count: number; listQuery: LeadsListQuery };
  overdueTasks: {
    taskCount: number;
    leadCount: number;
    agentCount: number;
    listQuery: LeadsListQuery;
    byAgent: AttentionOverdueAgentRow[];
  };
  hotUntouched: {
    hours: number;
    count: number;
    listQuery: LeadsListQuery;
    byAgent: AttentionAgentRow[];
  };
  noNextStep: { count: number; listQuery: LeadsListQuery };
  stuck: AttentionStageGroup;
  stale: AttentionStageGroup;
  unassigned: { count: number; oldestCreatedAt: string | null; listQuery: LeadsListQuery };
}

export type NudgeKind = "overdue_tasks" | "hot_untouched";

export interface NudgeAgentResult {
  sent: boolean;
  reason: "ALREADY_NUDGED" | "NOTHING_TO_NUDGE" | null;
  kind: NudgeKind;
  userId: string;
  count: number;
  nextAllowedAt: string | null;
}

export function leadsHref(query: LeadsListQuery): string {
  return `/leads?${new URLSearchParams(query).toString()}`;
}
