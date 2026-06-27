import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { STALE_PROCESSING_JOB_MS } from './import-jobs.constants';

const WATCHDOG_INTERVAL_MS = 5 * 60 * 1000;

const STALE_JOB_ERROR = [
  {
    row: 0,
    reason: 'Import processing timed out (worker may have stopped)',
  },
] as const;

@Injectable()
export class ImportJobWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportJobWatchdogService.name);
  private intervalRef?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    void this.failStaleProcessingJobs();
    this.intervalRef = setInterval(
      () => void this.failStaleProcessingJobs(),
      WATCHDOG_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  async failStaleProcessingJobs(): Promise<number> {
    const cutoff = new Date(Date.now() - STALE_PROCESSING_JOB_MS);

    const result = await this.prisma.importJob.updateMany({
      where: {
        status: JobStatus.PROCESSING,
        updatedAt: { lt: cutoff },
      },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date(),
        errorSummary: STALE_JOB_ERROR as unknown as Prisma.InputJsonValue,
      },
    });

    if (result.count > 0) {
      this.logger.warn(
        `Marked ${result.count} stale import job(s) as FAILED (no progress for ${STALE_PROCESSING_JOB_MS / 60_000} minutes)`,
      );
    }

    return result.count;
  }

  isStaleProcessingJob(updatedAt: Date): boolean {
    return updatedAt.getTime() < Date.now() - STALE_PROCESSING_JOB_MS;
  }
}
