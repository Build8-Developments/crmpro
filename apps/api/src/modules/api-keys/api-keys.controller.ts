import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { RequirePlanFeature } from '../../common/entitlements/decorators/require-plan-feature.decorator';
import { PLAN_FEATURES } from '../../common/entitlements/entitlement.constants';
import { PlanEntitlementGuard } from '../../common/entitlements/guards/plan-entitlement.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

/** Settings → Integrations: keys external systems use to send leads in. */
@Controller('api-keys')
@UseGuards(JwtAuthGuard, PermissionsGuard, PlanEntitlementGuard)
@RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
@RequirePlanFeature(PLAN_FEATURES.API_ACCESS)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.apiKeysService.list(user.tenantId);

    return { success: true, data };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    const data = await this.apiKeysService.create(user.tenantId, user.id, dto);

    return { success: true, data };
  }

  @Delete(':id')
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.apiKeysService.revoke(user.tenantId, user.id, id);

    return { success: true, data };
  }
}
