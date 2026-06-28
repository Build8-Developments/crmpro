export const TASK_JOB_NAME = 'process-task';
export const TASK_OVERDUE_SCAN_JOB = 'task-overdue-scan';
export const TASK_SORT_FIELDS = [
  'title',
  'dueAt',
  'priority',
  'status',
  'type',
  'createdAt',
  'updatedAt',
] as const;

export const DEFAULT_OVERDUE_SCAN_INTERVAL_MS = 900_000;
