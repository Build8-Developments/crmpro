import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ANALYTICS_INVALIDATION_EVENT_TYPES,
  DomainEvent,
} from '../../common/events/domain-event.types';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { AnalyticsInvalidationService } from './analytics-invalidation.service';

@Injectable()
export class AnalyticsInvalidationListener implements OnModuleInit {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly invalidation: AnalyticsInvalidationService,
  ) {}

  onModuleInit(): void {
    const invalidate = (event: DomainEvent) => {
      void this.invalidation.invalidateTenant(event.tenantId);
    };

    for (const type of ANALYTICS_INVALIDATION_EVENT_TYPES) {
      this.eventBus.subscribe(type, invalidate);
    }
  }
}
