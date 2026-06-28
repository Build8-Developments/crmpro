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
import { PermissionsGuard, RequirePermission } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { CreateLeadExportDto } from '../dto/create-lead-export.dto';
import { GetExportJobsQueryDto } from '../dto/get-export-jobs-query.dto';
import { ExportJobsService } from '../services/export-jobs.service';

@Controller('export-jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExportJobsController {
  constructor(private readonly exportJobsService: ExportJobsService) {}

  @Post('leads')
  @RequirePermission(PERMISSIONS.EXPORT_JOB_CREATE)
  async createLeadExportJob(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeadExportDto,
  ) {
    const data = await this.exportJobsService.createLeadExportJob(
      user.tenantId,
      user.id,
      dto,
    );

    return { success: true, data };
  }

  @Get()
  @RequirePermission(PERMISSIONS.EXPORT_JOB_READ)
  async listExportJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetExportJobsQueryDto,
  ) {
    const data = await this.exportJobsService.listExportJobs(
      user.tenantId,
      query,
    );

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.EXPORT_JOB_READ)
  async getExportJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.exportJobsService.getExportJob(id, user.tenantId);

    return { success: true, data };
  }
}
