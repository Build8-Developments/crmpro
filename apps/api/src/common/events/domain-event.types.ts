export const DOMAIN_EVENT_TYPES = {
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_MOVED_STAGE: 'lead.moved_stage',
  LEAD_ASSIGNED: 'lead.assigned',
  LEAD_ACTIVITY_LOGGED: 'lead.activity_logged',
  TASK_CHANGED: 'task.changed',
  PIPELINE_CHANGED: 'pipeline.changed',
  IMPORT_COMPLETED: 'import.completed',
  EXPORT_COMPLETED: 'export.completed',
  NOTIFICATION_CREATED: 'notification.created',
  SUPPORT_MESSAGE_CREATED: 'support.message.created',
} as const;

export type DomainEventType =
  (typeof DOMAIN_EVENT_TYPES)[keyof typeof DOMAIN_EVENT_TYPES];

export interface DomainEvent {
  readonly type: DomainEventType;
  readonly tenantId: string;
}

/** A call/WhatsApp/email/meeting/visit was logged (contact timestamps moved). */
export class LeadActivityLoggedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.LEAD_ACTIVITY_LOGGED;

  constructor(
    readonly tenantId: string,
    readonly leadId: string,
  ) {}
}

/** A follow-up task was created, changed, completed, cancelled or deleted. */
export class TaskChangedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.TASK_CHANGED;

  constructor(
    readonly tenantId: string,
    readonly taskId: string,
    readonly leadId: string | null,
  ) {}
}

export class LeadCreatedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.LEAD_CREATED;

  constructor(
    readonly tenantId: string,
    readonly leadId: string,
  ) {}
}

export class LeadUpdatedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.LEAD_UPDATED;

  constructor(
    readonly tenantId: string,
    readonly leadId: string,
  ) {}
}

export class LeadMovedStageEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.LEAD_MOVED_STAGE;

  constructor(
    readonly tenantId: string,
    readonly leadId: string,
  ) {}
}

export class LeadAssignedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.LEAD_ASSIGNED;

  constructor(
    readonly tenantId: string,
    readonly leadId: string,
  ) {}
}

export class PipelineChangedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.PIPELINE_CHANGED;

  constructor(
    readonly tenantId: string,
    readonly pipelineId: string,
  ) {}
}

export class ImportCompletedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.IMPORT_COMPLETED;

  constructor(
    readonly tenantId: string,
    readonly importJobId: string,
  ) {}
}

export class ExportCompletedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.EXPORT_COMPLETED;

  constructor(
    readonly tenantId: string,
    readonly exportJobId: string,
  ) {}
}

export const ANALYTICS_INVALIDATION_EVENT_TYPES: readonly DomainEventType[] = [
  DOMAIN_EVENT_TYPES.LEAD_CREATED,
  DOMAIN_EVENT_TYPES.LEAD_UPDATED,
  DOMAIN_EVENT_TYPES.LEAD_MOVED_STAGE,
  DOMAIN_EVENT_TYPES.LEAD_ASSIGNED,
  // Response-time and stale metrics depend on contact timestamps.
  DOMAIN_EVENT_TYPES.LEAD_ACTIVITY_LOGGED,
  DOMAIN_EVENT_TYPES.PIPELINE_CHANGED,
  DOMAIN_EVENT_TYPES.IMPORT_COMPLETED,
  DOMAIN_EVENT_TYPES.EXPORT_COMPLETED,
];

export class NotificationCreatedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.NOTIFICATION_CREATED;

  constructor(
    readonly tenantId: string,
    readonly userId: string,
    readonly actorId?: string,
  ) {}
}

export class SupportMessageCreatedEvent implements DomainEvent {
  readonly type = DOMAIN_EVENT_TYPES.SUPPORT_MESSAGE_CREATED;

  constructor(
    readonly tenantId: string,
    readonly conversationId: string,
    readonly userId: string,
    readonly actorId?: string,
  ) {}
}
