import { Controller, Get, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('overview')
  @RequirePermission(PERMISSIONS.BILLING_MANAGE)
  async overview(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.billing.getOverview(user.tenantId),
    };
  }
}
