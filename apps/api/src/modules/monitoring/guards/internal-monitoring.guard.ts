import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class InternalMonitoringGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('monitoring.internalKey');
    if (!expected) {
      throw new UnauthorizedException(
        'Internal monitoring is not configured on this API',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-internal-monitoring-key');
    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid internal monitoring key');
    }

    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
