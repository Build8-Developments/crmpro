import { Injectable, Logger } from '@nestjs/common';
import { BullService } from '../jobs/bull/bull.service';
import { AUTOMATION_QUEUE } from '../jobs/bull/bull.constants';
import { RequestContextService } from '../../common/logging/request-context.service';
import { WorkerLoggingService } from '../../common/logging/worker-logging.service';
import { LoggingService } from '../../common/logging/logging.service';
import { AUTOMATION_JOB_NAME } from './automation.constants';
import { AutomationJobPayload } from './entities/automation.types';
import { AutomationMetricsStore } from './metrics/automation-metrics.store';

@Injectable()
export class AutomationQueueService {
  private readonly logger = new Logger(AutomationQueueService.name);

  constructor(
    private readonly bullService: BullService,
    private readonly requestContext: RequestContextService,
    private readonly workerLoggingService: WorkerLoggingService,
    private readonly loggingService: LoggingService,
    private readonly metricsStore: AutomationMetricsStore,
  ) {}

  async enqueue(payload: AutomationJobPayload, delayMs?: number): Promise<void> {
    const requestId = this.requestContext.getRequestId();
    const jobPayload: AutomationJobPayload = requestId
      ? { ...payload, requestId }
      : payload;

    await this.bullService.getQueue(AUTOMATION_QUEUE).add(
      AUTOMATION_JOB_NAME,
      jobPayload,
      {
        jobId: `automation:${payload.workflowId}:${payload.entityId}:${Date.now()}`,
        ...(delayMs && delayMs > 0 ? { delay: delayMs } : {}),
      },
    );

    this.metricsStore.recordExecution();

    this.workerLoggingService.queued({
      queue: AUTOMATION_QUEUE,
      jobId: `${payload.workflowId}:${payload.entityId}`,
      requestId,
    });

    this.loggingService.info({
      module: 'Automation',
      operation: 'queue',
      status: 'queued',
      metadata: {
        workflowId: payload.workflowId,
        triggerType: payload.triggerType,
        entityType: payload.entityType,
        entityId: payload.entityId,
        tenantId: payload.tenantId,
      },
    });

    this.logger.log(
      `Automation queued: workflow=${payload.workflowId} entity=${payload.entityType}:${payload.entityId}`,
    );
  }
}
