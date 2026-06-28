import { Module, forwardRef } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [NotificationsModule, forwardRef(() => LeadsModule)],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
