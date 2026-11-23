import { Module } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsService } from './services/permissions.service';
import { LeadScopeService } from './lead-scope/lead-scope.service';
import { ResolveLeadScopePipe } from './lead-scope/current-lead-scope.decorator';

@Module({
  providers: [
    PermissionsService,
    PermissionsGuard,
    LeadScopeService,
    ResolveLeadScopePipe,
  ],
  exports: [
    PermissionsService,
    PermissionsGuard,
    LeadScopeService,
    ResolveLeadScopePipe,
  ],
})
export class AuthRbacModule {}
