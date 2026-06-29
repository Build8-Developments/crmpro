import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpLoggingInterceptor } from './common/logging/interceptors/http-logging.interceptor';
import { CacheModule } from './common/cache/cache.module';
import { DomainEventsModule } from './common/events/domain-events.module';
import { LoggingModule } from './common/logging/logging.module';
import { RequestIdMiddleware } from './common/logging/middleware/request-id.middleware';
import { PrismaModule } from './common/prisma/prisma.module';
import { SecurityModule } from './common/security/security.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { DevelopersModule } from './modules/developers/developers.module';
import { LeadSourcesModule } from './modules/lead-sources/lead-sources.module';
import { LeadsModule } from './modules/leads/leads.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { FilesModule } from './modules/files/files.module';
import { ImportJobsModule } from './modules/import-jobs/import-jobs.module';
import { ExportJobsModule } from './modules/export-jobs/export-jobs.module';
import { JobsCoreModule } from './modules/jobs/jobs-core.module';
import { WorkersModule } from './modules/jobs/workers.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    LoggingModule,
    DomainEventsModule,
    CacheModule,
    PrismaModule,
    SecurityModule,
    StorageModule,
    AuthModule,
    PipelinesModule,
    LeadSourcesModule,
    LeadsModule,
    DevelopersModule,
    ProjectsModule,
    FilesModule,
    JobsCoreModule,
    ImportJobsModule,
    ExportJobsModule,
    WorkersModule,
    MonitoringModule,
    AnalyticsModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
  }
}
