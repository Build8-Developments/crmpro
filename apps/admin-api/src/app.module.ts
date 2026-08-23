import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PrismaModule } from './common/prisma/prisma.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AdminsModule } from './modules/admins/admins.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { PlansModule } from './modules/plans/plans.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PlatformAnalyticsModule } from './modules/platform-analytics/platform-analytics.module';
import { SystemModule } from './modules/system/system.module';
import { SearchModule } from './modules/search/search.module';
import { SupportModule } from './modules/support/support.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    AuthModule,
    AdminsModule,
    PlansModule,
    ContractsModule,
    TenantsModule,
    AuditModule,
    PlatformAnalyticsModule,
    SystemModule,
    SearchModule,
    SupportModule,
    RealtimeModule,
  ],
  controllers: [],
  providers: [
    GlobalExceptionFilter,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
