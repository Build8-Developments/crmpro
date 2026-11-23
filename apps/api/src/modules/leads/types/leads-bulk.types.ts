export type BulkLeadFailure = {
  leadId: string;
  reason: string;
};

export type BulkLeadActionResult = {
  successCount: number;
  failureCount: number;
  failures: BulkLeadFailure[];
};

export interface TransferPreview {
  leadCount: number;
  hotLeads: number;
  overdueLeads: number;
  openTasks: number;
  byStage: Array<{
    stageId: string;
    name: string;
    color: string | null;
    icon: string | null;
    count: number;
  }>;
  allocations: Array<{
    userId: string;
    name: string;
    currentOpenLeads: number;
    leadCount: number;
  }>;
}
