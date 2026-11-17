import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  INTERACTION_OUTCOMES,
  INTERACTION_TYPES,
  type InteractionOutcome,
  type InteractionType,
} from '../tasks.constants';
import { NextFollowUpDto } from './next-follow-up.dto';

export class LogLeadActivityDto {
  @IsIn(INTERACTION_TYPES)
  type: InteractionType;

  @IsOptional()
  @IsIn(INTERACTION_OUTCOMES)
  outcome?: InteractionOutcome;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24 * 60 * 60)
  durationSeconds?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(2000)
  note?: string;

  /** When it happened; defaults to now. Cannot be in the future. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => NextFollowUpDto)
  nextFollowUp?: NextFollowUpDto;
}
