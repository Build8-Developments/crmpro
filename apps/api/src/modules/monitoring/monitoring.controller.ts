import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

  @Get('jobs/health')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.TENANT_MANAGE)
  @ApiOperation({ summary: 'Background jobs and worker health' })
  @ApiResponse({ status: 200, description: 'Jobs health snapshot' })
  async getJobsHealth() {
    const data = await this.monitoringService.getJobsHealth();
    return { success: true, data };
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.TENANT_MANAGE)
  @ApiOperation({ summary: 'Runtime HTTP and queue metrics' })
  @ApiResponse({ status: 200, description: 'Runtime metrics snapshot' })
  async getMetrics() {
    const data = await this.monitoringService.getMetrics();
    return { success: true, data };
  }
}
