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
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import {
  CurrentPermissionKeys,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { LeadScopeService } from '../leads/scope/lead-scope.service';
import type { LeadScope } from '../leads/scope/lead-scope.types';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTaskSummaryQueryDto } from './dto/get-task-summary-query.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly leadScopeService: LeadScopeService,
  ) {}

  private scope(
    user: AuthenticatedUser,
    permissionKeys: ReadonlySet<PermissionKey>,
  ): Promise<LeadScope> {
    return this.leadScopeService.resolve(user, permissionKeys);
  }

  @Get()
  @RequirePermission(PERMISSIONS.TASK_READ)
  async listTasks(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Query() query: GetTasksQueryDto,
  ) {
    const data = await this.tasksService.listTasks(
      user.tenantId,
      query,
      await this.scope(user, permissionKeys),
    );
    return { success: true, data };
  }

  @Get('summary')
  @RequirePermission(PERMISSIONS.TASK_READ)
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Query() query: GetTaskSummaryQueryDto,
  ) {
    const now = new Date();
    const utcEndOfDay = new Date(now);
    utcEndOfDay.setUTCHours(23, 59, 59, 999);
    const endOfToday = query.todayEnd ?? utcEndOfDay;
    const endOfWeek =
      query.weekEnd ?? new Date(endOfToday.getTime() + 6 * 86_400_000);

    const data = await this.tasksService.getSummary(
      user.tenantId,
      await this.scope(user, permissionKeys),
      { now, endOfToday, endOfWeek },
    );
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.TASK_READ)
  async getTask(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tasksService.getTask(
      id,
      user.tenantId,
      await this.scope(user, permissionKeys),
    );
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.TASK_CREATE)
  async createTask(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Body() dto: CreateTaskDto,
  ) {
    const data = await this.tasksService.createTask(
      user.tenantId,
      user.id,
      dto,
      await this.scope(user, permissionKeys),
    );
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.TASK_UPDATE)
  async updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const data = await this.tasksService.updateTask(
      id,
      user.tenantId,
      user.id,
      dto,
      await this.scope(user, permissionKeys),
    );
    return { success: true, data };
  }

  @Post(':id/complete')
  @RequirePermission(PERMISSIONS.TASK_UPDATE)
  async completeTask(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteTaskDto,
  ) {
    const data = await this.tasksService.completeTask(
      id,
      user.tenantId,
      user.id,
      dto,
      await this.scope(user, permissionKeys),
    );
    return { success: true, data };
  }

  @Post(':id/cancel')
  @RequirePermission(PERMISSIONS.TASK_UPDATE)
  async cancelTask(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tasksService.cancelTask(
      id,
      user.tenantId,
      user.id,
      await this.scope(user, permissionKeys),
    );
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.TASK_DELETE)
  async deleteTask(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tasksService.deleteTask(
      id,
      user.tenantId,
      await this.scope(user, permissionKeys),
    );
    return { success: true, data };
  }
}
