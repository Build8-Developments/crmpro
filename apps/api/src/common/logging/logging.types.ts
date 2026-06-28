export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogEntry {
  module: string;
  operation: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  durationMs?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface RequestContextData {
  requestId?: string;
  tenantId?: string;
  userId?: string;
}
