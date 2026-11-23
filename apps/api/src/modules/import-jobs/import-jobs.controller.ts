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
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  PermissionsService,
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
import { PreviewImportDto } from './dto/preview-import.dto';
import { ImportJobsService, type ImportActor } from './import-jobs.service';

@Controller('import-jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard, PlanEntitlementGuard)
export class ImportJobsController {
  constructor(
    private readonly importJobsService: ImportJobsService,
    private readonly permissions: PermissionsService,
  ) {}

  /** Assignment during import is a manager's call (lead.assign). */
  private async resolveActor(
    user: AuthenticatedUser,
    scope: LeadScope,
  ): Promise<ImportActor> {
    const keys = await this.permissions.getPermissionKeysForUser(
      user.id,
      user.tenantId,
    );
    return { scope, canAssign: keys.has(PERMISSIONS.LEAD_ASSIGN) };
  }

  /** Reads an uploaded file and suggests a column mapping (nothing is saved). */
  @Post('preview')
  @RequirePermission(PERMISSIONS.IMPORT_JOB_CREATE)
  @RequirePlanFeature(PLAN_FEATURES.IMPORT_EXPORT)
  async previewImport(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: PreviewImportDto,
  ) {
    const data = await this.importJobsService.previewImport(
      user.tenantId,
      dto.fileAssetId,
      await this.resolveActor(user, scope),
    );

    return { success: true, data };
  }

  @Post('leads')
  @RequirePermission(PERMISSIONS.IMPORT_JOB_CREATE)
  @RequirePlanFeature(PLAN_FEATURES.IMPORT_EXPORT)
  async createLeadImportJob(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: CreateLeadImportJobDto,
  ) {
    const data = await this.importJobsService.createLeadImportJob(
      user.tenantId,
      user.id,
      dto,
      await this.resolveActor(user, scope),
    );

    return { success: true, data };
  }

  @Get()
  @RequirePermission(PERMISSIONS.IMPORT_JOB_READ)
  async listImportJobs(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: GetImportJobsQueryDto,
  ) {
    const data = await this.importJobsService.listImportJobs(
      user.tenantId,
      query,
      scope,
    );

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.IMPORT_JOB_READ)
  async getImportJob(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.importJobsService.getImportJob(
      id,
      user.tenantId,
      scope,
    );

    return { success: true, data };
  }
}
