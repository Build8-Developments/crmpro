import { Injectable } from '@nestjs/common';
import {
  CleanupHealthProvider as ICleanupHealthProvider,
  CleanupHealthSummary,
} from '../../common/health';
import { CleanupHealthService } from './cleanup-health.service';

@Injectable()
export class CleanupHealthProvider implements ICleanupHealthProvider {
  constructor(private readonly cleanupHealthService: CleanupHealthService) {}

  getJobsHealthSummary(): CleanupHealthSummary {
    return this.cleanupHealthService.getHealthSummary();
  }
}
