import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { STALE_PROCESSING_EXPORT_JOB_MS } from './export-jobs.constants';

const WATCHDOG_INTERVAL_MS = 5 * 60 * 1000;

const STALE_EXPORT_JOB_ERROR =
  'Export processing timed out (worker may have stopped)';

@Injectable()
export class ExportJobWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExportJobWatchdogService.name);
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
    const cutoff = new Date(Date.now() - STALE_PROCESSING_EXPORT_JOB_MS);

    const result = await this.prisma.exportJob.updateMany({
      where: {
        status: JobStatus.PROCESSING,
        updatedAt: { lt: cutoff },
      },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date(),
        errorMessage: STALE_EXPORT_JOB_ERROR,
      },
    });

    if (result.count > 0) {
      this.logger.warn(
        `Marked ${result.count} stale export job(s) as FAILED (no progress for ${STALE_PROCESSING_EXPORT_JOB_MS / 60_000} minutes)`,
      );
    }

    return result.count;
  }
}
