import { TargetMetric } from '@crmpro/database';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PERIOD_PATTERN } from '../../../common/utils/month-period.util';
import { MAX_TARGET_ENTRIES, MAX_TARGET_VALUE } from '../targets.constants';

export class TargetEntryDto {
  /** A person, or null for the whole workspace. */
  @ValidateIf((entry: TargetEntryDto) => entry.userId !== null)
  @IsUUID()
  userId: string | null;

  @IsEnum(TargetMetric)
  metric: TargetMetric;

  /** The goal, or null to clear it. */
  @ValidateIf((entry: TargetEntryDto) => entry.value !== null)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_TARGET_VALUE)
  value: number | null;
}

export class SaveTargetsDto {
  @Matches(PERIOD_PATTERN, { message: 'period must be YYYY-MM' })
  period: string;

  @IsArray()
  @ArrayMaxSize(MAX_TARGET_ENTRIES)
  @ValidateNested({ each: true })
  @Type(() => TargetEntryDto)
  entries: TargetEntryDto[];
}
