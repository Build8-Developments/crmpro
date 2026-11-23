import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  PermissionsService,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { SaveTargetsDto } from './dto/save-targets.dto';
import { TargetPeriodQueryDto } from './dto/target-period-query.dto';
import { TargetsService } from './targets.service';

/** Monthly targets (workflow spec §2.6). */
@Controller('targets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TargetsController {
  constructor(
    private readonly targets: TargetsService,
    private readonly permissions: PermissionsService,
  ) {}

  /** Everyone the caller manages (and the workspace) with actuals. */
  @Get()
  @RequirePermission(PERMISSIONS.TARGET_MANAGE)
  async getGrid(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: TargetPeriodQueryDto,
  ) {
    const data = await this.targets.getGrid(user, scope, query.period);
    return { success: true, data };
  }

  @Put()
  @RequirePermission(PERMISSIONS.TARGET_MANAGE)
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: SaveTargetsDto,
  ) {
    const data = await this.targets.save(user, scope, dto);
    return { success: true, data };
  }

  /** Averages of the last 3 complete months; nothing is saved. */
  @Get('suggest')
  @RequirePermission(PERMISSIONS.TARGET_MANAGE)
  async suggest(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: TargetPeriodQueryDto,
  ) {
    const data = await this.targets.suggest(user, scope, query.period);
    return { success: true, data };
  }

  /** The caller's own month, for the Today side panel. */
  @Get('me')
  @RequirePermission(PERMISSIONS.TARGET_READ)
  async getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: { permissionKeys?: Set<PermissionKey> },
    @Query() query: TargetPeriodQueryDto,
  ) {
    const permissionKeys =
      request.permissionKeys ??
      (await this.permissions.getPermissionKeysForUser(user.id, user.tenantId));
    const data = await this.targets.getMine(user, permissionKeys, query.period);
    return { success: true, data };
  }
}
