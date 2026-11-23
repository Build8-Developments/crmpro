import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { DealsService } from './deals.service';

@Controller('leads/:leadId/deals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadDealsController {
  constructor(private readonly deals: DealsService) {}

  /** The lead's deal history, cancelled deals included. */
  @Get()
  @RequirePermission(PERMISSIONS.DEAL_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('leadId', ParseUUIDPipe) leadId: string,
  ) {
    const data = await this.deals.listForLead(user.tenantId, leadId, scope);
    return { success: true, data };
  }
}
