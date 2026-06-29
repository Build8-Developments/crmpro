import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AdminsModule } from './modules/admins/admins.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { PlansModule } from './modules/plans/plans.module';
import { TenantsModule } from './modules/tenants/tenants.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
