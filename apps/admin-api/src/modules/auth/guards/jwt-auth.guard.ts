import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AuthenticatedAdmin } from '../auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TAdmin = AuthenticatedAdmin>(
    err: Error | null,
    admin: TAdmin | false,
    _info: unknown,
    context: ExecutionContext,
  ): TAdmin {
    if (err || !admin) {
      throw err ?? new UnauthorizedException('Invalid authentication session');
    }

    const request = context.switchToHttp().getRequest<Request>();
    request.admin = admin as unknown as AuthenticatedAdmin;

    return admin;
  }
}
