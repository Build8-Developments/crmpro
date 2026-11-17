export { AuthRbacModule } from './auth-rbac.module';
export { PERMISSIONS_METADATA_KEY } from './constants';
export { RequirePermission } from './decorators/require-permission.decorator';
export { CurrentPermissionKeys } from './decorators/current-permission-keys.decorator';
export { PermissionsGuard } from './guards/permissions.guard';
export {
  PermissionsService,
  type UserAuthorization,
} from './services/permissions.service';
