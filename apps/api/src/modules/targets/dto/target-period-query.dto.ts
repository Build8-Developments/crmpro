import { IsOptional, Matches } from 'class-validator';
import { PERIOD_PATTERN } from '../../../common/utils/month-period.util';

export class TargetPeriodQueryDto {
  /** Calendar month "YYYY-MM"; defaults to the current workspace month. */
  @IsOptional()
  @Matches(PERIOD_PATTERN, { message: 'period must be YYYY-MM' })
  period?: string;
}
