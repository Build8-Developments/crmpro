export type BulkLeadFailure = {
  leadId: string;
  reason: string;
};

export type BulkLeadActionResult = {
  successCount: number;
  failureCount: number;
  failures: BulkLeadFailure[];
};
