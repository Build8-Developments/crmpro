import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  DASHBOARD_PERIOD_DEFAULT,
  type DashboardPeriod,
  type DashboardPeriodKey,
  resolveDashboardPeriod,
} from './dashboard-period';

const DEFAULT_TIME_ZONE = 'Africa/Cairo';

@Injectable()
export class DashboardPeriodService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    tenantId: string,
    key: DashboardPeriodKey = DASHBOARD_PERIOD_DEFAULT,
    now = new Date(),
  ): Promise<DashboardPeriod> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { timezone: true },
    });
    return resolveDashboardPeriod(
      key,
      settings?.timezone ?? DEFAULT_TIME_ZONE,
      now,
    );
  }
}
