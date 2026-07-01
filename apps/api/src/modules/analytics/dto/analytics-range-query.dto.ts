import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ANALYTICS_RANGE_DEFAULT,
  ANALYTICS_RANGE_KEYS,
  type AnalyticsRangeKey,
} from '../analytics.constants';

const AnalyticsRangeEnum = {
  SEVEN_DAYS: '7d',
  THIRTY_DAYS: '30d',
  NINETY_DAYS: '90d',
} as const;

export class AnalyticsRangeQueryDto {
  @ApiPropertyOptional({
    enum: ANALYTICS_RANGE_KEYS,
    default: ANALYTICS_RANGE_DEFAULT,
    description: 'Relative lookback window for dashboard analytics',
  })
  @IsOptional()
  @IsEnum(AnalyticsRangeEnum, {
    message: `range must be one of: ${ANALYTICS_RANGE_KEYS.join(', ')}`,
  })
  range?: AnalyticsRangeKey = ANALYTICS_RANGE_DEFAULT;
}
