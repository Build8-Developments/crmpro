import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { LeadWorkloadService } from './services/lead-workload.service';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { BulkAssignLeadsDto } from './dto/bulk-assign-leads.dto';
import { BulkMoveStageDto } from './dto/bulk-move-stage.dto';
import { BulkTransferLeadsDto } from './dto/bulk-transfer-leads.dto';
import { LeadsBulkService } from './leads-bulk.service';

@Controller('leads/bulk')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsBulkController {
  constructor(
    private readonly leadsBulkService: LeadsBulkService,
    private readonly workload: LeadWorkloadService,
  ) {}

  /** Open leads, hot, overdue, no next step and open tasks per person. */
  @Get('workload')
  @RequirePermission(PERMISSIONS.LEAD_ASSIGN)
  async getWorkload(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
  ) {
    const data = await this.workload.getWorkload(user.tenantId, scope);
    return { success: true, data };
  }

  @Post('transfer/preview')
  @RequirePermission(PERMISSIONS.LEAD_ASSIGN)
  async previewTransfer(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: BulkTransferLeadsDto,
  ) {
    const data = await this.leadsBulkService.previewTransfer(
      user.tenantId,
      dto,
      scope,
    );
    return { success: true, data };
  }

  @Post('assign')
  @RequirePermission(PERMISSIONS.LEAD_ASSIGN)
  async bulkAssignLeads(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: BulkAssignLeadsDto,
  ) {
    const data = await this.leadsBulkService.bulkAssignLeads(
      user.tenantId,
      user.id,
      dto,
      scope,
    );

    return { success: true, data };
  }

  @Post('transfer')
  @RequirePermission(PERMISSIONS.LEAD_ASSIGN)
  async bulkTransferLeads(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: BulkTransferLeadsDto,
  ) {
    const data = await this.leadsBulkService.bulkTransferLeads(
      user.tenantId,
      user.id,
      dto,
      scope,
    );

    return { success: true, data };
  }

  @Post('move-stage')
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async bulkMoveStage(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: BulkMoveStageDto,
  ) {
    const data = await this.leadsBulkService.bulkMoveStage(
      user.tenantId,
      user.id,
      dto,
      scope,
    );

    return { success: true, data };
  }
}
