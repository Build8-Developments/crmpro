import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  PermissionsService,
  RequirePermission,
} from '../../common/auth';
import { PLAN_FEATURES } from '../../common/entitlements/entitlement.constants';
import { RequirePlanFeature } from '../../common/entitlements/decorators/require-plan-feature.decorator';
import { PlanEntitlementGuard } from '../../common/entitlements/guards/plan-entitlement.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { GetDailyStatsQueryDto } from './dto/get-daily-stats-query.dto';
import { PerformanceService } from './performance/performance.service';
import { StatsQueryService } from './stats-query.service';

/** Per-user daily performance numbers (UserDailyStat, spec §2.8). */
@ApiTags('Stats')
@ApiBearerAuth()
@Controller('stats')
@UseGuards(JwtAuthGuard, PermissionsGuard, PlanEntitlementGuard)
export class StatsController {
  constructor(
    private readonly stats: StatsQueryService,
    private readonly performance: PerformanceService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get('daily')
  @RequirePermission(PERMISSIONS.ANALYTICS_READ)
  // Team reports are part of the Analytics plan feature, like /analytics.
  // The caller's own summary (below) is not: it feeds Today / My performance.
  @RequirePlanFeature(PLAN_FEATURES.ANALYTICS)
  @ApiOperation({ summary: 'Daily stats rows and totals for a date range' })
  @ApiResponse({ status: 200, description: 'Rows (max 366 days) + totals' })
  async getDaily(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: GetDailyStatsQueryDto,
  ) {
    const data = await this.stats.getDaily(user, scope, query);
    return { success: true, data };
  }

  @Get('me/summary')
  @RequirePermission(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: "The caller's today / week / month / all-time" })
  @ApiResponse({ status: 200, description: 'Totals and current streak' })
  async getMySummary(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.stats.getMySummary(user);
    return { success: true, data };
  }

  @Get('me/performance')
  @RequirePermission(PERMISSIONS.ANALYTICS_READ)
  // Like me/summary: the caller's own numbers, not behind the Analytics plan.
  @ApiOperation({ summary: "The caller's performance, badges and rank" })
  @ApiResponse({
    status: 200,
    description: 'All-time totals, month vs target, bests, badges, rank',
  })
  async getMyPerformance(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Req() request: { permissionKeys?: Set<PermissionKey> },
  ) {
    const permissionKeys =
      request.permissionKeys ??
      (await this.permissions.getPermissionKeysForUser(user.id, user.tenantId));
    const data = await this.performance.getMyPerformance(
      user,
      scope,
      permissionKeys,
    );
    return { success: true, data };
  }
}
