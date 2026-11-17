import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { TenantSettingsService } from './tenant-settings.service';

@Controller('tenant-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantSettingsController {
  constructor(private readonly settings: TenantSettingsService) {}

  /** Readable by every member: the UI needs timezone, currency and locale. */
  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.settings.getView(user.tenantId);
    return { success: true, data };
  }

  @Patch()
  @RequirePermission(PERMISSIONS.TENANT_MANAGE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    const data = await this.settings.update(user.tenantId, user.id, dto);
    return { success: true, data };
  }
}
