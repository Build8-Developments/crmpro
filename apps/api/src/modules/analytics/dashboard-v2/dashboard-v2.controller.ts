import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  RequirePermission,
} from '../../../common/auth';
import { PLAN_FEATURES } from '../../../common/entitlements/entitlement.constants';
import { RequirePlanFeature } from '../../../common/entitlements/decorators/require-plan-feature.decorator';
import { PlanEntitlementGuard } from '../../../common/entitlements/guards/plan-entitlement.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { DashboardAttentionService } from './dashboard-attention.service';
import { DashboardLossesService } from './dashboard-losses.service';
import { DashboardMoneyService } from './dashboard-money.service';
import { DashboardPeriodService } from './dashboard-period.service';
import { DashboardSourcesService } from './dashboard-sources.service';
import { DashboardTeamService } from './dashboard-team.service';
import { DashboardAttentionNudgeDto } from './dto/dashboard-attention-nudge.dto';
import { DashboardV2QueryDto } from './dto/dashboard-v2-query.dto';

/**
 * Owner / manager dashboard v2 (spec §5): one endpoint per section so each
 * loads on its own. Every section is scoped to the caller's lead scope
 * (managers with team scope see their team).
 */
@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics/v2')
@UseGuards(JwtAuthGuard, PermissionsGuard, PlanEntitlementGuard)
@RequirePlanFeature(PLAN_FEATURES.ANALYTICS)
@RequirePermission(PERMISSIONS.ANALYTICS_READ)
export class DashboardV2Controller {
  constructor(
    private readonly periods: DashboardPeriodService,
    private readonly attention: DashboardAttentionService,
    private readonly money: DashboardMoneyService,
    private readonly team: DashboardTeamService,
    private readonly sources: DashboardSourcesService,
    private readonly losses: DashboardLossesService,
  ) {}

  @Get('attention')
  @ApiOperation({ summary: 'Needs attention now (§5.1)' })
  async getAttention(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: DashboardV2QueryDto,
  ) {
    const period = await this.periods.resolve(user.tenantId, query.period);
    const data = await this.attention.get(user.tenantId, scope, period);
    return { success: true, data };
  }

  /** "Nudge agent": an in-app reminder, at most once per agent and kind per hour. */
  @Post('attention/nudge')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.ANALYTICS_READ, PERMISSIONS.LEAD_ASSIGN)
  @ApiOperation({ summary: 'Nudge an agent about overdue tasks / hot leads' })
  async nudgeAgent(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() body: DashboardAttentionNudgeDto,
  ) {
    const data = await this.attention.nudge(user, scope, body);
    return { success: true, data };
  }

  @Get('money')
  @ApiOperation({ summary: 'Are we making money? (§5.2)' })
  async getMoney(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: DashboardV2QueryDto,
  ) {
    const period = await this.periods.resolve(user.tenantId, query.period);
    const data = await this.money.get(user.tenantId, scope, period);
    return { success: true, data };
  }

  @Get('team')
  @ApiOperation({ summary: 'Is the team doing the work? (§5.3)' })
  async getTeam(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: DashboardV2QueryDto,
  ) {
    const period = await this.periods.resolve(user.tenantId, query.period);
    const data = await this.team.get(user.tenantId, scope, period);
    return { success: true, data };
  }

  @Get('sources')
  @ApiOperation({ summary: 'Which leads are worth it? (§5.4)' })
  async getSources(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: DashboardV2QueryDto,
  ) {
    const period = await this.periods.resolve(user.tenantId, query.period);
    const data = await this.sources.get(user.tenantId, scope, period);
    return { success: true, data };
  }

  @Get('losses')
  @ApiOperation({ summary: 'Where do we lose? (§5.5)' })
  async getLosses(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: DashboardV2QueryDto,
  ) {
    const period = await this.periods.resolve(user.tenantId, query.period);
    const data = await this.losses.get(user.tenantId, scope, period);
    return { success: true, data };
  }
}
