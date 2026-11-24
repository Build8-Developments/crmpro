import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [PrismaModule, RateLimitModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
