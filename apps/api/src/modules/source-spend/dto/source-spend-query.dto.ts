import { IsOptional, Matches } from 'class-validator';
import { PERIOD_PATTERN } from '../../../common/utils/month-period.util';

export class SourceSpendQueryDto {
  /** First month "YYYY-MM" (inclusive). */
  @IsOptional()
  @Matches(PERIOD_PATTERN, { message: 'from must be YYYY-MM' })
  from?: string;

  /** Last month "YYYY-MM" (inclusive). */
  @IsOptional()
  @Matches(PERIOD_PATTERN, { message: 'to must be YYYY-MM' })
  to?: string;
}
