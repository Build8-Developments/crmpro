import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import {
  CurrentPermissionKeys,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { BulkAssignLeadsDto } from './dto/bulk-assign-leads.dto';
import { BulkMoveStageDto } from './dto/bulk-move-stage.dto';
import { LeadsBulkService } from './leads-bulk.service';
import { LeadScopeService } from './scope/lead-scope.service';

@Controller('leads/bulk')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsBulkController {
  constructor(
    private readonly leadsBulkService: LeadsBulkService,
    private readonly leadScopeService: LeadScopeService,
  ) {}

  @Post('assign')
  @RequirePermission(PERMISSIONS.LEAD_ASSIGN)
  async bulkAssignLeads(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Body() dto: BulkAssignLeadsDto,
  ) {
    const data = await this.leadsBulkService.bulkAssignLeads(
      user.tenantId,
      user.id,
      dto,
      await this.leadScopeService.resolve(user, permissionKeys),
    );

    return { success: true, data };
  }

  @Post('move-stage')
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async bulkMoveStage(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Body() dto: BulkMoveStageDto,
  ) {
    const data = await this.leadsBulkService.bulkMoveStage(
      user.tenantId,
      user.id,
      dto,
      await this.leadScopeService.resolve(user, permissionKeys),
    );

    return { success: true, data };
  }
}
