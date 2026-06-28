import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.NOTIFICATION_READ)
  @ApiOperation({ summary: 'List notifications for the current user' })
  async listNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetNotificationsQueryDto,
  ) {
    const data = await this.notificationsService.listNotifications(
      user.tenantId,
      user.id,
      query,
    );

    return { success: true, data };
  }

  @Get('unread-count')
  @RequirePermission(PERMISSIONS.NOTIFICATION_READ)
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.notificationsService.getUnreadCount(
      user.tenantId,
      user.id,
    );

    return { success: true, data: { count } };
  }

  @Patch('read-all')
  @RequirePermission(PERMISSIONS.NOTIFICATION_UPDATE)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.notificationsService.markAllAsRead(
      user.tenantId,
      user.id,
    );

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.NOTIFICATION_READ)
  @ApiOperation({ summary: 'Get a notification by id' })
  async getNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.notificationsService.getNotification(
      user.tenantId,
      user.id,
      id,
    );

    return { success: true, data };
  }

  @Patch(':id/read')
  @RequirePermission(PERMISSIONS.NOTIFICATION_UPDATE)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.notificationsService.markAsRead(
      user.tenantId,
      user.id,
      id,
    );

    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.NOTIFICATION_DELETE)
  @ApiOperation({ summary: 'Soft delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.notificationsService.softDelete(
      user.tenantId,
      user.id,
      id,
    );

    return { success: true, data };
  }
}
