import { SetMetadata } from '@nestjs/common';
import {
  AUTH_RATE_LIMIT_METADATA_KEY,
  AuthRateLimitKind,
} from './rate-limit.constants';

export const AuthRateLimit = (kind: AuthRateLimitKind) =>
  SetMetadata(AUTH_RATE_LIMIT_METADATA_KEY, kind);
