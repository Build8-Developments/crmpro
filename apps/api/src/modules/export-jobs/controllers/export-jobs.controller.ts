import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import {
  CurrentPermissionKeys,
  PermissionsGuard,
  RequirePermission,
} from '../../../common/auth';
import { LeadScopeService } from '../../leads/scope/lead-scope.service';
import { PLAN_FEATURES } from '../../../common/entitlements/entitlement.constants';
import { RequirePlanFeature } from '../../../common/entitlements/decorators/require-plan-feature.decorator';
import { PlanEntitlementGuard } from '../../../common/entitlements/guards/plan-entitlement.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { CreateLeadExportDto } from '../dto/create-lead-export.dto';
import { GetExportJobsQueryDto } from '../dto/get-export-jobs-query.dto';
import { ExportJobsService } from '../services/export-jobs.service';

@Controller('export-jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard, PlanEntitlementGuard)
export class ExportJobsController {
  constructor(
    private readonly exportJobsService: ExportJobsService,
    private readonly leadScopeService: LeadScopeService,
  ) {}

  @Post('leads')
  @RequirePermission(PERMISSIONS.EXPORT_JOB_CREATE)
  @RequirePlanFeature(PLAN_FEATURES.IMPORT_EXPORT)
  async createLeadExportJob(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Body() dto: CreateLeadExportDto,
  ) {
    const data = await this.exportJobsService.createLeadExportJob(
      user.tenantId,
      user.id,
      dto,
      await this.leadScopeService.resolve(user, permissionKeys),
    );

    return { success: true, data };
  }

  @Get()
  @RequirePermission(PERMISSIONS.EXPORT_JOB_READ)
  async listExportJobs(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Query() query: GetExportJobsQueryDto,
  ) {
    const data = await this.exportJobsService.listExportJobs(
      user.tenantId,
      query,
      await this.leadScopeService.resolve(user, permissionKeys),
    );

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.EXPORT_JOB_READ)
  async getExportJob(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.exportJobsService.getExportJob(
      id,
      user.tenantId,
      await this.leadScopeService.resolve(user, permissionKeys),
    );

    return { success: true, data };
  }
}
