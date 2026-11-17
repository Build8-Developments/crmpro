import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [PrismaModule, TenantSettingsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
