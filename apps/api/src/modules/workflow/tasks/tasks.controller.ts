import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  RequirePermission,
} from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import {
  CompleteTaskDto,
  CreateTaskDto,
  GetTasksQueryDto,
  SkipTaskDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { TasksService } from './tasks.service';

/**
 * Tasks are the "next steps" of the workflow engine. Everyone works their own
 * tasks; seeing or changing other people's needs lead.assign (managers) —
 * enforced in the service.
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: GetTasksQueryDto,
  ) {
    const data = await this.tasks.list(user, query, scope);
    return { success: true, data };
  }

  @Get('summary')
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async summary(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.tasks.summary(user);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: CreateTaskDto,
  ) {
    const data = await this.tasks.create(user, dto, scope);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const data = await this.tasks.update(user, id, dto, scope);
    return { success: true, data };
  }

  @Post(':id/skip')
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async skip(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SkipTaskDto,
  ) {
    const data = await this.tasks.skip(user, id, dto, scope);
    return { success: true, data };
  }

  @Post(':id/complete')
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteTaskDto,
  ) {
    const data = await this.tasks.complete(user, id, dto, scope);
    return { success: true, data };
  }
}
