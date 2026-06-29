import type { AdminPermissionKey } from '@crmpro/shared';
import type { AuthenticatedAdmin } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
      permissionKeys?: Set<AdminPermissionKey>;
    }
  }
}

export {};
