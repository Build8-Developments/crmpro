import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
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
import { LogLeadActivityDto } from './dto/log-lead-activity.dto';
import { LeadInteractionsService } from './lead-interactions.service';

/** POST /leads/:id/activities — log a call, WhatsApp, email, meeting or visit. */
@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadInteractionsController {
  constructor(
    private readonly interactionsService: LeadInteractionsService,
    private readonly leadScopeService: LeadScopeService,
  ) {}

  @Post(':id/activities')
  @RequirePermission(PERMISSIONS.LEAD_ACTIVITY_CREATE)
  async logActivity(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogLeadActivityDto,
  ) {
    const data = await this.interactionsService.logActivity(
      id,
      user.tenantId,
      user.id,
      dto,
      await this.leadScopeService.resolve(user, permissionKeys),
    );
    return { success: true, data };
  }
}
