import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsService } from '../../common/auth/services/permissions.service';
import { AnalyticsAggregatorService } from './analytics-aggregator.service';
import { OverviewAnalyticsService } from './services/overview-analytics.service';
import { PipelineAnalyticsService } from './services/pipeline-analytics.service';
import { TrendAnalyticsService } from './services/trend-analytics.service';
import { TeamAnalyticsService } from './services/team-analytics.service';
import { ActivityAnalyticsService } from './services/activity-analytics.service';

describe('AnalyticsAggregatorService', () => {
  let service: AnalyticsAggregatorService;
  let permissionsService: { getPermissionKeysForUser: jest.Mock };
  let overviewService: { getOverview: jest.Mock };
  let pipelineService: { getPipeline: jest.Mock };
  let trendService: { getTrends: jest.Mock };
  let teamService: { getTeam: jest.Mock };
  let activityService: { getActivity: jest.Mock };

  const overview = { totalLeads: 10, staleLeads: 2, unassignedLeads: 1 };
  const pipeline = {
    pipelineId: 'pipe-1',
    pipelineName: 'Sales',
    stages: [{ stageId: 's1', name: 'New', count: 5, avgDaysInStage: 2.1 }],
  };
  const trends = {
    leadCreation: [{ date: '2026-06-01', count: 3 }],
    leadClosing: [{ date: '2026-06-01', count: 1 }],
  };
  const team = {
    topPerformers: [
      {
        userId: 'u1',
        name: 'Ahmed',
        assignedLeads: 10,
        wonLeads: 2,
        conversionRate: 20,
      },
    ],
  };
  const activity = [
    {
      id: 'a1',
      type: 'LEAD_ASSIGNED',
      title: 'Lead assigned: Jane',
      occurredAt: '2026-06-29T12:00:00.000Z',
      metadata: {},
    },
  ];

  beforeEach(async () => {
    permissionsService = {
      getPermissionKeysForUser: jest
        .fn()
        .mockResolvedValue(new Set(Object.values(PERMISSIONS))),
    };
    overviewService = {
      getOverview: jest.fn().mockResolvedValue(overview),
    };
    pipelineService = {
      getPipeline: jest.fn().mockResolvedValue(pipeline),
    };
    trendService = {
      getTrends: jest.fn().mockResolvedValue(trends),
    };
    teamService = {
      getTeam: jest.fn().mockResolvedValue(team),
    };
    activityService = {
      getActivity: jest.fn().mockResolvedValue(activity),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsAggregatorService,
        { provide: PermissionsService, useValue: permissionsService },
        { provide: OverviewAnalyticsService, useValue: overviewService },
        { provide: PipelineAnalyticsService, useValue: pipelineService },
        { provide: TrendAnalyticsService, useValue: trendService },
        { provide: TeamAnalyticsService, useValue: teamService },
        { provide: ActivityAnalyticsService, useValue: activityService },
      ],
    }).compile();

    service = module.get(AnalyticsAggregatorService);
  });

  it('returns all sections for owner permissions', async () => {
    const result = await service.getDashboard('user-1', 'tenant-1', '30d');

    expect(result).toEqual({
      overview,
      pipeline,
      trends,
      team,
      activity,
    });
    expect(overviewService.getOverview).toHaveBeenCalled();
    expect(pipelineService.getPipeline).toHaveBeenCalled();
    expect(trendService.getTrends).toHaveBeenCalled();
    expect(teamService.getTeam).toHaveBeenCalled();
    expect(activityService.getActivity).toHaveBeenCalledWith('tenant-1', {
      includeAudit: true,
    });
  });

  it('returns only allowed sections for restricted users', async () => {
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set([PERMISSIONS.ANALYTICS_READ, PERMISSIONS.PIPELINE_READ]),
    );

    const result = await service.getDashboard('user-2', 'tenant-1', '7d');

    expect(result).toEqual({
      overview,
      pipeline,
      trends,
    });
    expect(teamService.getTeam).not.toHaveBeenCalled();
    expect(activityService.getActivity).not.toHaveBeenCalled();
  });

  it('skips unauthorized service queries entirely', async () => {
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set([PERMISSIONS.LEAD_READ]),
    );

    const result = await service.getDashboard('user-3', 'tenant-1', '30d');

    expect(result).toEqual({ activity });
    expect(overviewService.getOverview).not.toHaveBeenCalled();
    expect(pipelineService.getPipeline).not.toHaveBeenCalled();
    expect(trendService.getTrends).not.toHaveBeenCalled();
    expect(teamService.getTeam).not.toHaveBeenCalled();
    expect(activityService.getActivity).toHaveBeenCalledWith('tenant-1', {
      includeAudit: false,
    });
  });
});
