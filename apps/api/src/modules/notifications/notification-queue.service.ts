import { Injectable, Logger } from '@nestjs/common';
import { BullService } from '../jobs/bull/bull.service';
import { NOTIFICATION_QUEUE } from '../jobs/bull/bull.constants';
import { RequestContextService } from '../../common/logging/request-context.service';
import { WorkerLoggingService } from '../../common/logging/worker-logging.service';
import { NOTIFICATION_JOB_NAME } from './notifications.constants';
import { NotificationJobPayload } from './entities/notification.types';
import { LoggingService } from '../../common/logging/logging.service';
import { NotificationMetricsStore } from './metrics/notification-metrics.store';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    private readonly bullService: BullService,
    private readonly requestContext: RequestContextService,
    private readonly workerLoggingService: WorkerLoggingService,
    private readonly loggingService: LoggingService,
    private readonly metricsStore: NotificationMetricsStore,
  ) {}

  async enqueue(payload: NotificationJobPayload): Promise<void> {
    const requestId = this.requestContext.getRequestId();
    const jobPayload: NotificationJobPayload = requestId
      ? { ...payload, requestId }
      : payload;

    await this.bullService
      .getQueue(NOTIFICATION_QUEUE)
      .add(NOTIFICATION_JOB_NAME, jobPayload, {
        jobId: `notification:${payload.tenantId}:${payload.recipientUserId}:${Date.now()}`,
      });

    this.metricsStore.recordCreated();

    this.workerLoggingService.queued({
      queue: NOTIFICATION_QUEUE,
      jobId: `${payload.type}:${payload.recipientUserId}`,
      requestId,
    });

    this.loggingService.info({
      module: 'Notifications',
      operation: 'queue',
      status: 'queued',
      metadata: {
        type: payload.type,
        recipientUserId: payload.recipientUserId,
        tenantId: payload.tenantId,
      },
    });

    this.logger.log(
      `Notification queued: type=${payload.type} recipient=${payload.recipientUserId}`,
    );
  }
}
