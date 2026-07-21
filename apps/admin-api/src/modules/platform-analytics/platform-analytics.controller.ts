import { Controller, Get, UseGuards } from '@nestjs/common';
import { ADMIN_PERMISSIONS } from '@crmpro/shared';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
} from '../../common/auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAnalyticsService } from './platform-analytics.service';

@Controller('platform-analytics')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class PlatformAnalyticsController {
  constructor(
    private readonly platformAnalyticsService: PlatformAnalyticsService,
  ) {}

  @Get('dashboard')
  @RequireAdminPermission(ADMIN_PERMISSIONS.PLATFORM_ANALYTICS_READ)
  async getDashboard() {
    const data = await this.platformAnalyticsService.getDashboard();
    return { success: true, data };
  }
}
