import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  RequirePermission,
} from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { LogInteractionDto } from './dto/log-interaction.dto';
import { InteractionsService } from './interactions.service';

@Controller('leads/:leadId/interactions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('leadId', ParseUUIDPipe) leadId: string,
  ) {
    const data = await this.interactions.list(user.tenantId, leadId, scope);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async log(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: LogInteractionDto,
  ) {
    const data = await this.interactions.log(user, leadId, dto, scope);
    return { success: true, data };
  }
}
