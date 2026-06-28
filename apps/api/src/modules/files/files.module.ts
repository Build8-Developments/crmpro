import { Module } from '@nestjs/common';
import { LeadAttachmentModule } from '../lead-attachments/lead-attachment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [NotificationsModule, LeadAttachmentModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
