import type { PermissionKey } from '@crmpro/shared/auth';
import type { AuthenticatedUser } from '../modules/auth/types/jwt-payload.type';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      permissionKeys?: Set<PermissionKey>;
      requestId?: string;
      requestStartedAt?: number;
    }
  }
}

export {};
