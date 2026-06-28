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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AssignTaskDto, CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { GetTasksQueryDto, TaskDashboardQueryDto } from './dto/get-tasks-query.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermission(PERMISSIONS.TASK_READ)
  @ApiOperation({ summary: 'List tasks' })
  async listTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetTasksQueryDto,
  ) {
    const data = await this.tasksService.listTasks(user.tenantId, query);
    return { success: true, data };
  }

  @Get('dashboard')
  @RequirePermission(PERMISSIONS.TASK_READ)
  @ApiOperation({ summary: 'Task dashboard metrics' })
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TaskDashboardQueryDto,
  ) {
    const data = await this.tasksService.getDashboard(user.tenantId, query);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.TASK_CREATE)
  @ApiOperation({ summary: 'Create task' })
  async createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    const data = await this.tasksService.createTask(
      user.tenantId,
      user.id,
      dto,
    );
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.TASK_READ)
  @ApiOperation({ summary: 'Get task by ID' })
  async getTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tasksService.getTask(user.tenantId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.TASK_UPDATE)
  @ApiOperation({ summary: 'Update task' })
  async updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const data = await this.tasksService.updateTask(
      user.tenantId,
      id,
      user.id,
      dto,
    );
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.TASK_DELETE)
  @ApiOperation({ summary: 'Soft delete task' })
  async deleteTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tasksService.deleteTask(user.tenantId, id);
    return { success: true, data };
  }

  @Patch(':id/start')
  @RequirePermission(PERMISSIONS.TASK_UPDATE)
  @ApiOperation({ summary: 'Start task' })
  async startTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tasksService.startTask(user.tenantId, id, user.id);
    return { success: true, data };
  }

  @Patch(':id/complete')
  @RequirePermission(PERMISSIONS.TASK_UPDATE)
  @ApiOperation({ summary: 'Complete task' })
  async completeTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tasksService.completeTask(
      user.tenantId,
      id,
      user.id,
    );
    return { success: true, data };
  }

  @Patch(':id/cancel')
  @RequirePermission(PERMISSIONS.TASK_UPDATE)
  @ApiOperation({ summary: 'Cancel task' })
  async cancelTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tasksService.cancelTask(user.tenantId, id, user.id);
    return { success: true, data };
  }

  @Patch(':id/assign')
  @RequirePermission(PERMISSIONS.TASK_ASSIGN)
  @ApiOperation({ summary: 'Assign task to user' })
  async assignTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTaskDto,
  ) {
    const data = await this.tasksService.assignTask(
      user.tenantId,
      id,
      user.id,
      dto,
    );
    return { success: true, data };
  }
}
