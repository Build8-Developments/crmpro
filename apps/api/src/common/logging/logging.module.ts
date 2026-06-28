import { Global, Module } from '@nestjs/common';
import { HttpMetricsStore } from './http-metrics.store';
import { LoggingService } from './logging.service';
import { RequestContextService } from './request-context.service';
import { WorkerLoggingService } from './worker-logging.service';
import { StorageLoggingService } from './storage-logging.service';
import { AuthLoggingService } from './auth-logging.service';

@Global()
@Module({
  providers: [
    RequestContextService,
    LoggingService,
    HttpMetricsStore,
    WorkerLoggingService,
    StorageLoggingService,
    AuthLoggingService,
  ],
  exports: [
    RequestContextService,
    LoggingService,
    HttpMetricsStore,
    WorkerLoggingService,
    StorageLoggingService,
    AuthLoggingService,
  ],
})
export class LoggingModule {}
