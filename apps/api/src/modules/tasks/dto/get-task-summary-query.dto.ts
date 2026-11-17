import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

/**
 * The client sends its local day/week ends so "today" matches the user's
 * timezone. Defaults: end of the current UTC day, +6 days for the week.
 */
export class GetTaskSummaryQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  todayEnd?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  weekEnd?: Date;
}
