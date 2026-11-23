import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import {
  DOMAIN_EVENT_TYPES,
  type DomainEvent,
  NotificationCreatedEvent,
  SupportMessageCreatedEvent,
} from '../../common/events/domain-event.types';
import { RealtimeGateway } from './realtime.gateway';

type RealtimePayload = { event: string; data: unknown };

/** Events that make lead lists, boards and drawers stale for the tenant. */
const LEAD_INVALIDATION_EVENTS = [
  DOMAIN_EVENT_TYPES.LEAD_CREATED,
  DOMAIN_EVENT_TYPES.LEAD_UPDATED,
  DOMAIN_EVENT_TYPES.LEAD_MOVED_STAGE,
  DOMAIN_EVENT_TYPES.LEAD_ASSIGNED,
] as const;

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly gateway: RealtimeGateway,
  ) {}

  onModuleInit() {
    // The tenant room only ever gets data-free "invalidate" hints; clients
    // refetch through the API, which re-applies each user's lead scope.
    for (const type of LEAD_INVALIDATION_EVENTS) {
      this.eventBus.subscribe(type, (event: DomainEvent) => {
        this.notifyTenant(event.tenantId, {
          event: 'invalidate',
          data: { entity: 'leads' },
        });
      });
    }
    this.eventBus.subscribe(
      DOMAIN_EVENT_TYPES.TASKS_CHANGED,
      (event: DomainEvent) => {
        this.notifyTenant(event.tenantId, {
          event: 'invalidate',
          data: { entity: 'tasks' },
        });
      },
    );

    this.eventBus.subscribe(
      DOMAIN_EVENT_TYPES.NOTIFICATION_CREATED,
      (event: NotificationCreatedEvent) => {
        this.notifyUser(event.userId, {
          event: 'invalidate',
          data: { entity: 'notifications', actorId: event.actorId },
        });
      },
    );

    this.eventBus.subscribe(
      DOMAIN_EVENT_TYPES.SUPPORT_MESSAGE_CREATED,
      (event: SupportMessageCreatedEvent) => {
        this.notifyUser(event.userId, {
          event: 'invalidate',
          data: {
            entity: 'support-messages',
            conversationId: event.conversationId,
            actorId: event.actorId,
          },
        });

        // Notify admins
        this.notifyAdmins({
          event: 'invalidate',
          data: {
            entity: 'support-messages',
            conversationId: event.conversationId,
            actorId: event.actorId,
          },
        });
      },
    );
  }

  onModuleDestroy() {
    // cleanup if needed
  }

  notifyTenant(tenantId: string, payload: RealtimePayload) {
    this.gateway.server
      .to(`tenant:${tenantId}`)
      .emit(payload.event, payload.data);
  }

  notifyUser(userId: string, payload: RealtimePayload) {
    this.gateway.server.to(`user:${userId}`).emit(payload.event, payload.data);
  }

  notifyAdmins(payload: RealtimePayload) {
    this.gateway.server.to('admin-broadcast').emit(payload.event, payload.data);
  }
}
