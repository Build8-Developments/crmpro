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
} from '../../common/auth';
import { PLAN_FEATURES } from '../../common/entitlements/entitlement.constants';
import { RequirePlanFeature } from '../../common/entitlements/decorators/require-plan-feature.decorator';
import { PlanEntitlementGuard } from '../../common/entitlements/guards/plan-entitlement.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateLeadImportJobDto } from './dto/create-lead-import-job.dto';
import { GetImportJobsQueryDto } from './dto/get-import-jobs-query.dto';
import { ImportJobsService } from './import-jobs.service';

@Controller('import-jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard, PlanEntitlementGuard)
export class ImportJobsController {
  constructor(private readonly importJobsService: ImportJobsService) {}

  private resolveOwnerFilter(
    user: AuthenticatedUser,
    permissionKeys: ReadonlySet<PermissionKey>,
  ): string | null {
    return permissionKeys.has(PERMISSIONS.LEAD_READ_ALL) ? null : user.id;
  }

  @Post('leads')
  @RequirePermission(PERMISSIONS.IMPORT_JOB_CREATE)
  @RequirePlanFeature(PLAN_FEATURES.IMPORT_EXPORT)
  async createLeadImportJob(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeadImportJobDto,
  ) {
    const data = await this.importJobsService.createLeadImportJob(
      user.tenantId,
      user.id,
      dto,
    );

    return { success: true, data };
  }

  @Get()
  @RequirePermission(PERMISSIONS.IMPORT_JOB_READ)
  async listImportJobs(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Query() query: GetImportJobsQueryDto,
  ) {
    const data = await this.importJobsService.listImportJobs(
      user.tenantId,
      query,
      this.resolveOwnerFilter(user, permissionKeys),
    );

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.IMPORT_JOB_READ)
  async getImportJob(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.importJobsService.getImportJob(
      id,
      user.tenantId,
      this.resolveOwnerFilter(user, permissionKeys),
    );

    return { success: true, data };
  }
}
