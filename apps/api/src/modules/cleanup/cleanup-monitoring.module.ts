import { Module } from '@nestjs/common';
import {
  CLEANUP_HEALTH_PROVIDER,
  CLEANUP_SCHEDULER_HEALTH,
} from '../../common/health';
import { CleanupModule } from './cleanup.module';
import { CleanupHealthProvider } from './cleanup-health.provider';
import { CleanupSchedulerHealthProvider } from './cleanup-scheduler-health.provider';

@Module({
  imports: [CleanupModule],
  providers: [
    CleanupHealthProvider,
    CleanupSchedulerHealthProvider,
    {
      provide: CLEANUP_HEALTH_PROVIDER,
      useExisting: CleanupHealthProvider,
    },
    {
      provide: CLEANUP_SCHEDULER_HEALTH,
      useExisting: CleanupSchedulerHealthProvider,
    },
  ],
  exports: [CLEANUP_HEALTH_PROVIDER, CLEANUP_SCHEDULER_HEALTH],
})
export class CleanupMonitoringModule {}
