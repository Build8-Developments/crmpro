import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { ListLeadSourcesQueryDto } from './dto/list-lead-sources-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { UpdateLeadSourceDto } from './dto/update-lead-source.dto';
import { LeadSourcesService } from './lead-sources.service';

@Controller('lead-sources')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadSourcesController {
  constructor(private readonly leadSourcesService: LeadSourcesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_SOURCE_READ)
  async listLeadSources(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLeadSourcesQueryDto,
  ) {
    const data = await this.leadSourcesService.listLeadSources(
      user.tenantId,
      query,
    );

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.LEAD_SOURCE_READ)
  async getLeadSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.leadSourcesService.getLeadSource(id, user.tenantId);

    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.LEAD_SOURCE_CREATE)
  async createLeadSource(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeadSourceDto,
  ) {
    const data = await this.leadSourcesService.createLeadSource(
      user.tenantId,
      dto,
    );

    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.LEAD_SOURCE_UPDATE)
  async updateLeadSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadSourceDto,
  ) {
    const data = await this.leadSourcesService.updateLeadSource(
      id,
      user.tenantId,
      dto,
    );

    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.LEAD_SOURCE_DELETE)
  async deleteLeadSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.leadSourcesService.deleteLeadSource(
      id,
      user.tenantId,
    );

    return { success: true, data };
  }
}
