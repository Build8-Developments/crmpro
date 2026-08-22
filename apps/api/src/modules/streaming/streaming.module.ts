import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { DomainEventsModule } from '../../common/events/domain-events.module';

@Module({
  imports: [DomainEventsModule],
  controllers: [StreamingController],
  providers: [StreamingService],
})
export class StreamingModule {}
