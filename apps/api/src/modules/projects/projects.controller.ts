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
import { CreateProjectDto } from './dto/create-project.dto';
import { GetProjectsQueryDto } from './dto/get-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PROJECT_READ)
  async listProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetProjectsQueryDto,
  ) {
    const data = await this.projectsService.listProjects(user.tenantId, query);

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PROJECT_READ)
  async getProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.projectsService.getProject(id, user.tenantId);

    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.PROJECT_CREATE)
  async createProject(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ) {
    const data = await this.projectsService.createProject(user.tenantId, dto);

    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.PROJECT_UPDATE)
  async updateProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const data = await this.projectsService.updateProject(
      id,
      user.tenantId,
      dto,
    );

    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.PROJECT_DELETE)
  async deleteProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.projectsService.deleteProject(id, user.tenantId);

    return { success: true, data };
  }
}
