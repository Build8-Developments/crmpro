import { Module } from '@nestjs/common';
import { LeadActivityService } from './services/lead-activity.service';

@Module({
  providers: [LeadActivityService],
  exports: [LeadActivityService],
})
export class LeadActivityModule {}
