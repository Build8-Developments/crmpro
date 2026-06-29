export const AUDIT_ENTITY_TYPES = {
  USER: 'User',
  ROLE: 'Role',
  FILE_ASSET: 'FileAsset',
  IMPORT_JOB: 'ImportJob',
  EXPORT_JOB: 'ExportJob',
  LEAD_BULK_ACTION: 'LeadBulkAction',
} as const;

export const FILE_AUDIT_ACTIONS = {
  DELETED: 'FILE_DELETED',
} as const;

export const IMPORT_AUDIT_ACTIONS = {
  STARTED: 'IMPORT_STARTED',
  COMPLETED: 'IMPORT_COMPLETED',
} as const;

export const EXPORT_AUDIT_ACTIONS = {
  STARTED: 'EXPORT_STARTED',
  COMPLETED: 'EXPORT_COMPLETED',
} as const;
