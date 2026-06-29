export { AuthRbacModule } from './auth-rbac.module';
export {
  ADMIN_ANY_PERMISSIONS_METADATA_KEY,
  ADMIN_PERMISSIONS_METADATA_KEY,
} from './constants';
export { RequireAdminPermission } from './decorators/require-admin-permission.decorator';
export { RequireAnyAdminPermission } from './decorators/require-any-admin-permission.decorator';
export { AdminPermissionsGuard } from './guards/admin-permissions.guard';
export {
  AdminPermissionsService,
  type AdminAuthorization,
} from './services/admin-permissions.service';
