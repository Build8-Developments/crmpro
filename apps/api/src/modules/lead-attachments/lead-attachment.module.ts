import { Module } from '@nestjs/common';
import { LeadActivityModule } from '../leads/lead-activity.module';
import { LeadAttachmentService } from './lead-attachment.service';

@Module({
  imports: [LeadActivityModule],
  providers: [LeadAttachmentService],
  exports: [LeadAttachmentService],
})
export class LeadAttachmentModule {}
