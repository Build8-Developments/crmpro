export const AUTOMATION_JOB_NAME = 'execute-automation';

export const AUTOMATION_SORT_FIELDS = [
  'name',
  'trigger',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

export const AUTOMATION_EXECUTION_SORT_FIELDS = [
  'createdAt',
  'status',
  'durationMs',
] as const;

export const PHASE1_ACTION_TYPES = [
  'CREATE_NOTIFICATION',
  'ASSIGN_AGENT',
  'MOVE_STAGE',
  'CREATE_NOTE',
  'CREATE_ACTIVITY',
  'DELAY',
  'ADD_TAG',
  'REMOVE_TAG',
] as const;
