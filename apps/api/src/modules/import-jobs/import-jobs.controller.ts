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
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateLeadImportJobDto } from './dto/create-lead-import-job.dto';
import { GetImportJobsQueryDto } from './dto/get-import-jobs-query.dto';
import { ImportJobsService } from './import-jobs.service';

@Controller('import-jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportJobsController {
  constructor(private readonly importJobsService: ImportJobsService) {}

  @Post('leads')
  @RequirePermission(PERMISSIONS.IMPORT_JOB_CREATE)
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
    @Query() query: GetImportJobsQueryDto,
  ) {
    const data = await this.importJobsService.listImportJobs(
      user.tenantId,
      query,
    );

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.IMPORT_JOB_READ)
  async getImportJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.importJobsService.getImportJob(id, user.tenantId);

    return { success: true, data };
  }
}
