import { Module } from '@nestjs/common';
import { BullModule } from './bull/bull.module';
import { QueueModule } from './queues/queue.module';

@Module({
  imports: [BullModule, QueueModule],
  exports: [QueueModule],
})
export class JobsCoreModule {}
