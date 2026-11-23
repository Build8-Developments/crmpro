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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import {
  CreateProjectUpdateDto,
  ProjectUpdatesFeedQueryDto,
  ProjectUpdatesPageQueryDto,
  UpdateProjectUpdateDto,
} from './dto/project-update.dto';
import { ProjectFilesService } from './project-files.service';
import { ProjectUpdatesService } from './project-updates.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectUpdatesController {
  constructor(
    private readonly service: ProjectUpdatesService,
    private readonly projectFiles: ProjectFilesService,
  ) {}

  /** Tenant-wide feed, newest first (`scope=mine` for the caller's projects). */
  @Get('project-updates')
  @RequirePermission(PERMISSIONS.PROJECT_READ)
  async feed(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProjectUpdatesFeedQueryDto,
  ) {
    const data = await this.service.feed(user.tenantId, user.id, query);
    return { success: true, data };
  }

  @Get('projects/:projectId/updates')
  @RequirePermission(PERMISSIONS.PROJECT_READ)
  async listForProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ProjectUpdatesPageQueryDto,
  ) {
    const data = await this.service.listForProject(
      user.tenantId,
      projectId,
      query,
    );
    return { success: true, data };
  }

  @Post('projects/:projectId/updates')
  @RequirePermission(PERMISSIONS.PROJECT_UPDATE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectUpdateDto,
  ) {
    const data = await this.service.create(
      user.tenantId,
      user.id,
      projectId,
      dto,
    );
    return { success: true, data };
  }

  @Patch('project-updates/:id')
  @RequirePermission(PERMISSIONS.PROJECT_UPDATE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectUpdateDto,
  ) {
    const data = await this.service.update(user.tenantId, user.id, id, dto);
    return { success: true, data };
  }

  @Delete('project-updates/:id')
  @RequirePermission(PERMISSIONS.PROJECT_UPDATE)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.service.remove(user.tenantId, user.id, id);
    return { success: true, data };
  }

  /** The project's brochures and price sheets (read-only). */
  @Get('projects/:projectId/files')
  @RequirePermission(PERMISSIONS.PROJECT_READ, PERMISSIONS.FILE_READ)
  async listFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    const data = await this.projectFiles.listForProject(
      user.tenantId,
      projectId,
    );
    return { success: true, data };
  }
}
