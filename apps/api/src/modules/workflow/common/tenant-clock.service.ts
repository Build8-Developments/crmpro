import { Injectable } from '@nestjs/common';
import {
  DEFAULT_WORK_SCHEDULE,
  dayBoundsInZone,
  type WorkSchedule,
} from '@crmpro/shared/workflow';
import { PrismaService } from '../../../common/prisma/prisma.service';

const DEFAULT_TIME_ZONE = 'Africa/Cairo';

/** What the rules engine needs from Settings → Leads & sales. */
export interface WorkflowSettings {
  schedule: WorkSchedule;
  firstContactSlaMinutes: number;
  escalateAfterMinutes: number;
  dailyInteractionGoal: number;
}

/**
 * "Now" and "today" in the tenant's time zone (Settings → General). Tasks
 * due "tomorrow 11:00" and the "due today" filter both depend on it.
 */
@Injectable()
export class TenantClockService {
  constructor(private readonly prisma: PrismaService) {}

  async getTimeZone(tenantId: string): Promise<string> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { timezone: true },
    });
    return settings?.timezone ?? DEFAULT_TIME_ZONE;
  }

  async todayBounds(
    tenantId: string,
    now = new Date(),
  ): Promise<{ start: Date; end: Date }> {
    return dayBoundsInZone(now, await this.getTimeZone(tenantId));
  }

  async getWorkflowSettings(tenantId: string): Promise<WorkflowSettings> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        timezone: true,
        workingDays: true,
        workdayStartMinute: true,
        workdayEndMinute: true,
        firstContactSlaMinutes: true,
        escalateAfterMinutes: true,
        dailyInteractionGoal: true,
      },
    });
    if (!settings) {
      return {
        schedule: DEFAULT_WORK_SCHEDULE,
        firstContactSlaMinutes: 15,
        escalateAfterMinutes: 30,
        dailyInteractionGoal: 25,
      };
    }
    return {
      schedule: {
        timeZone: settings.timezone,
        workingDays: settings.workingDays,
        startMinute: settings.workdayStartMinute,
        endMinute: settings.workdayEndMinute,
      },
      firstContactSlaMinutes: settings.firstContactSlaMinutes,
      escalateAfterMinutes: settings.escalateAfterMinutes,
      dailyInteractionGoal: settings.dailyInteractionGoal,
    };
  }
}
