import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InternalMonitoringGuard } from './guards/internal-monitoring.guard';
import { MonitoringService } from './monitoring.service';

@ApiTags('Monitoring')
@Controller()
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @ApiOperation({ summary: 'Global application health check' })
  @ApiResponse({ status: 200, description: 'Operational health snapshot' })
  async getHealth() {
    const data = await this.monitoringService.getGlobalHealth();
    return { success: true, data };
  }

  // Platform-wide data: never expose to tenant users (tenant.manage is held by
  // every agency Owner/Manager). Internal key only, like the snapshot below.
  @Get('jobs/health')
  @UseGuards(InternalMonitoringGuard)
  @ApiOperation({ summary: 'Background jobs and worker health' })
  @ApiResponse({ status: 200, description: 'Jobs health snapshot' })
  async getJobsHealth() {
    const data = await this.monitoringService.getJobsHealth();
    return { success: true, data };
  }

  @Get('metrics')
  @UseGuards(InternalMonitoringGuard)
  @ApiOperation({ summary: 'Runtime HTTP and queue metrics' })
  @ApiResponse({ status: 200, description: 'Runtime metrics snapshot' })
  async getMetrics() {
    const data = await this.monitoringService.getMetrics();
    return { success: true, data };
  }

  @Get('internal/monitoring/snapshot')
  @UseGuards(InternalMonitoringGuard)
  @ApiOperation({
    summary:
      'Internal ops snapshot for platform admin (health + jobs + metrics)',
  })
  @ApiResponse({ status: 200, description: 'Combined monitoring snapshot' })
  async getInternalSnapshot() {
    const data = await this.monitoringService.getSnapshot();
    return { success: true, data };
  }
}
