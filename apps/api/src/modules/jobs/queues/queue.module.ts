import { Module } from '@nestjs/common';
import { BullModule } from '../bull/bull.module';
import { QueueService } from './queue.service';

@Module({
  imports: [BullModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
