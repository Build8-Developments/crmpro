import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { QuotaModule } from '../../common/quota/quota.module';
import { AuditModule } from '../audit/audit.module';
import { LeadAttachmentModule } from '../lead-attachments/lead-attachment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FolderAccessService } from './folders/folder-access.service';
import { FoldersController } from './folders/folders.controller';
import { FoldersService } from './folders/folders.service';
import { FileThumbnailService } from './thumbnails/file-thumbnail.service';

@Module({
  imports: [AuthRbacModule, QuotaModule, AuditModule, NotificationsModule, LeadAttachmentModule],
  // FoldersController first so /files/folders and /files/move are matched
  // before FilesController's /files/:id routes.
  controllers: [FoldersController, FilesController],
  providers: [
    FilesService,
    FolderAccessService,
    FoldersService,
    FileThumbnailService,
  ],
  exports: [FilesService, FolderAccessService],
})
export class FilesModule {}
