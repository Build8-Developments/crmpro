import { Controller, Sse, UseGuards, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { StreamingService, SseMessageEvent } from './streaming.service';

@Controller('stream')
@UseGuards(JwtAuthGuard)
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Sse()
  stream(@CurrentAdmin() user: AuthenticatedAdmin): Observable<SseMessageEvent> {
    const subject = this.streamingService.subscribeUser(user.id);

    return subject.asObservable().pipe(
      finalize(() => {
        this.streamingService.unsubscribeUser(user.id, subject);
      }),
    );
  }
}
