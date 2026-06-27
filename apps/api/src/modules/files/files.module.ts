import { Module, forwardRef } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [forwardRef(() => LeadsModule)],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
