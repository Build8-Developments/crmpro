import { BadRequestException } from '@nestjs/common';
import {
  ANALYTICS_RANGE_DAYS,
  ANALYTICS_RANGE_DEFAULT,
  type AnalyticsRangeKey,
} from '../analytics.constants';
import type { AnalyticsDateRange } from '../analytics.types';

export function parseAnalyticsRange(
  range: AnalyticsRangeKey = ANALYTICS_RANGE_DEFAULT,
): AnalyticsDateRange {
  const days = ANALYTICS_RANGE_DAYS[range];
  if (!days) {
    throw new BadRequestException('Invalid analytics range');
  }

  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);

  return { from, to };
}

export function isAnalyticsRangeKey(value: string): value is AnalyticsRangeKey {
  return value in ANALYTICS_RANGE_DAYS;
}
