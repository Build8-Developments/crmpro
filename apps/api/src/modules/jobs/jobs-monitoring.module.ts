import { Module } from '@nestjs/common';
import { JOBS_HEALTH_PROVIDER } from '../../common/health';
import { JobsHealthProvider } from './jobs-health.provider';
import { WorkersModule } from './workers.module';

@Module({
  imports: [WorkersModule],
  providers: [
    { provide: JOBS_HEALTH_PROVIDER, useExisting: JobsHealthProvider },
  ],
  exports: [JOBS_HEALTH_PROVIDER],
})
export class JobsMonitoringModule {}
