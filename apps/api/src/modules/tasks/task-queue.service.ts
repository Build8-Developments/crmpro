import { Injectable, Logger } from '@nestjs/common';
import { BullService } from '../jobs/bull/bull.service';
import { TASK_QUEUE } from '../jobs/bull/bull.constants';
import { RequestContextService } from '../../common/logging/request-context.service';
import { WorkerLoggingService } from '../../common/logging/worker-logging.service';
import { LoggingService } from '../../common/logging/logging.service';
import { TASK_JOB_NAME } from './tasks.constants';
import { TaskJobPayload } from './entities/task.types';
import { TaskMetricsStore } from './metrics/task-metrics.store';

@Injectable()
export class TaskQueueService {
  private readonly logger = new Logger(TaskQueueService.name);

  constructor(
    private readonly bullService: BullService,
    private readonly requestContext: RequestContextService,
    private readonly workerLoggingService: WorkerLoggingService,
    private readonly loggingService: LoggingService,
    private readonly metricsStore: TaskMetricsStore,
  ) {}

  async enqueue(payload: TaskJobPayload, delayMs?: number): Promise<void> {
    const requestId = this.requestContext.getRequestId();
    const jobPayload: TaskJobPayload = requestId
      ? { ...payload, requestId }
      : payload;

    await this.bullService.getQueue(TASK_QUEUE).add(TASK_JOB_NAME, jobPayload, {
      jobId: `task:${payload.jobType}:${payload.taskId}:${Date.now()}`,
      ...(delayMs && delayMs > 0 ? { delay: delayMs } : {}),
    });

    this.workerLoggingService.queued({
      queue: TASK_QUEUE,
      jobId: `${payload.jobType}:${payload.taskId}`,
      requestId,
    });

    this.loggingService.info({
      module: 'Tasks',
      operation: 'queue',
      status: 'queued',
      metadata: {
        taskId: payload.taskId,
        jobType: payload.jobType,
        tenantId: payload.tenantId,
      },
    });

    this.logger.log(
      `Task job queued: type=${payload.jobType} task=${payload.taskId}`,
    );
  }
}
