import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  DASHBOARD_PERIOD_DEFAULT,
  DASHBOARD_PERIODS,
  type DashboardPeriodKey,
} from '../dashboard-period';

export class DashboardV2QueryDto {
  @ApiPropertyOptional({
    enum: DASHBOARD_PERIODS,
    default: DASHBOARD_PERIOD_DEFAULT,
  })
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS)
  period?: DashboardPeriodKey = DASHBOARD_PERIOD_DEFAULT;
}
