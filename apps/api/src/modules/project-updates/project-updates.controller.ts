import {
  Body,
  Controller,
  Delete,
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
import {
  CreateProjectUpdateDto,
  ProjectUpdatesQueryDto,
} from './dto/project-update.dto';
import { ProjectUpdatesService } from './project-updates.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectUpdatesController {
  constructor(private readonly service: ProjectUpdatesService) {}

  /** Tenant-wide feed, newest first. */
  @Get('project-updates')
  @RequirePermission(PERMISSIONS.PROJECT_READ)
  async feed(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProjectUpdatesQueryDto,
  ) {
    const data = await this.service.list(user.tenantId, query);
    return { success: true, data };
  }

  @Get('projects/:id/updates')
  @RequirePermission(PERMISSIONS.PROJECT_READ)
  async listForProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ProjectUpdatesQueryDto,
  ) {
    const data = await this.service.list(user.tenantId, {
      ...query,
      projectId: id,
    });
    return { success: true, data };
  }

  @Post('projects/:id/updates')
  @RequirePermission(PERMISSIONS.PROJECT_UPDATE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectUpdateDto,
  ) {
    const data = await this.service.create(user.tenantId, user.id, id, dto);
    return { success: true, data };
  }

  @Delete('projects/:id/updates/:updateId')
  @RequirePermission(PERMISSIONS.PROJECT_UPDATE)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('updateId', ParseUUIDPipe) updateId: string,
  ) {
    const data = await this.service.remove(
      user.tenantId,
      user.id,
      id,
      updateId,
    );
    return { success: true, data };
  }
}
