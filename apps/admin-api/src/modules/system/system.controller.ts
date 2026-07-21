import { Controller, Get, UseGuards } from '@nestjs/common';
import { ADMIN_PERMISSIONS } from '@crmpro/shared';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
} from '../../common/auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SystemService } from './system.service';

@Controller('system')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health')
  @RequireAdminPermission(ADMIN_PERMISSIONS.SUPPORT_ACCESS)
  async getHealth() {
    const data = await this.systemService.getHealth();
    return { success: true, data };
  }
}
