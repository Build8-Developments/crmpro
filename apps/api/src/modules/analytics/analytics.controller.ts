import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { PLAN_FEATURES } from '../../common/entitlements/entitlement.constants';
import { RequirePlanFeature } from '../../common/entitlements/decorators/require-plan-feature.decorator';
import { PlanEntitlementGuard } from '../../common/entitlements/guards/plan-entitlement.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDateQueryDto } from './dto/analytics-date-query.dto';
import { AnalyticsRecentActivityQueryDto } from './dto/analytics-recent-activity-query.dto';
import { parseAnalyticsDateRange } from './queries/analytics-date.util';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard, PlanEntitlementGuard)
@RequirePermission(PERMISSIONS.ANALYTICS_READ)
@RequirePlanFeature(PLAN_FEATURES.ANALYTICS)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview metrics' })
  @ApiResponse({ status: 200, description: 'Overview analytics snapshot' })
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateQueryDto,
  ) {
    const result = await this.analyticsService.getOverview(
      user.tenantId,
      parseAnalyticsDateRange(query),
    );
    return { success: true, data: result.data };
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Pipeline funnel analytics' })
  async getPipeline(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateQueryDto,
  ) {
    const result = await this.analyticsService.getPipelineFunnel(
      user.tenantId,
      parseAnalyticsDateRange(query),
    );
    return { success: true, data: result.data };
  }

  @Get('sources')
  @ApiOperation({ summary: 'Lead source performance' })
  async getSources(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateQueryDto,
  ) {
    const result = await this.analyticsService.getLeadSources(
      user.tenantId,
      parseAnalyticsDateRange(query),
    );
    return { success: true, data: result.data };
  }

  @Get('agents')
  @ApiOperation({ summary: 'Sales agent performance' })
  async getAgents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateQueryDto,
  ) {
    const result = await this.analyticsService.getAgentPerformance(
      user.tenantId,
      parseAnalyticsDateRange(query),
    );
    return { success: true, data: result.data };
  }

  @Get('projects')
  @ApiOperation({ summary: 'Project interest analytics' })
  async getProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateQueryDto,
  ) {
    const result = await this.analyticsService.getProjectPerformance(
      user.tenantId,
      parseAnalyticsDateRange(query),
    );
    return { success: true, data: result.data };
  }

  @Get('developers')
  @ApiOperation({ summary: 'Developer performance analytics' })
  async getDevelopers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateQueryDto,
  ) {
    const result = await this.analyticsService.getDeveloperPerformance(
      user.tenantId,
      parseAnalyticsDateRange(query),
    );
    return { success: true, data: result.data };
  }

  @Get('trends')
  @ApiOperation({ summary: 'Monthly lead trends' })
  async getTrends(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateQueryDto,
  ) {
    const result = await this.analyticsService.getLeadTrends(
      user.tenantId,
      parseAnalyticsDateRange(query),
    );
    return { success: true, data: result.data };
  }

  @Get('status')
  @ApiOperation({ summary: 'Lead status distribution' })
  async getStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsDateQueryDto,
  ) {
    const result = await this.analyticsService.getStatusDistribution(
      user.tenantId,
      parseAnalyticsDateRange(query),
    );
    return { success: true, data: result.data };
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Recent CRM activity feed' })
  async getRecentActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsRecentActivityQueryDto,
  ) {
    const result = await this.analyticsService.getRecentActivity(
      user.tenantId,
      parseAnalyticsDateRange(query),
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { success: true, data: result.data };
  }
}
