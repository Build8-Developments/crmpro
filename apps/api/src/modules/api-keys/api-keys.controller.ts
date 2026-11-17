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
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { PLAN_FEATURES } from '../../common/entitlements/entitlement.constants';
import { RequirePlanFeature } from '../../common/entitlements/decorators/require-plan-feature.decorator';
import { PlanEntitlementGuard } from '../../common/entitlements/guards/plan-entitlement.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { ApiKeysService } from './api-keys.service';

class CreateApiKeyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;
}

@Controller('api-keys')
@UseGuards(JwtAuthGuard, PermissionsGuard, PlanEntitlementGuard)
@RequirePermission(PERMISSIONS.API_KEY_MANAGE)
@RequirePlanFeature(PLAN_FEATURES.API_ACCESS)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.apiKeys.list(user.tenantId) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    const data = await this.apiKeys.create(
      user.tenantId,
      user.id,
      dto.name.trim(),
    );
    return { success: true, data };
  }

  @Delete(':id')
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.apiKeys.revoke(user.tenantId, user.id, id);
    return { success: true, data };
  }
}
