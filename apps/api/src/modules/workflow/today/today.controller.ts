import { Controller, Get, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { TodayService } from './today.service';

/** The caller's own day: tasks in order, progress and their numbers. */
@Controller('today')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TodayController {
  constructor(private readonly today: TodayService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async getToday(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.today.getToday(user);
    return { success: true, data };
  }
}
