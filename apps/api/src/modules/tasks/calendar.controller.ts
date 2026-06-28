import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { CalendarService } from './calendar.service';
import { CalendarQueryDto } from './dto/get-tasks-query.dto';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('calendar')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(PERMISSIONS.TASK_READ)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('day')
  @ApiOperation({ summary: 'Calendar day view' })
  async getDayView(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalendarQueryDto,
  ) {
    const data = await this.calendarService.getDayView(user.tenantId, query);
    return { success: true, data };
  }

  @Get('week')
  @ApiOperation({ summary: 'Calendar week view' })
  async getWeekView(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalendarQueryDto,
  ) {
    const data = await this.calendarService.getWeekView(user.tenantId, query);
    return { success: true, data };
  }

  @Get('month')
  @ApiOperation({ summary: 'Calendar month view' })
  async getMonthView(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalendarQueryDto,
  ) {
    const data = await this.calendarService.getMonthView(user.tenantId, query);
    return { success: true, data };
  }
}
