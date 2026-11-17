import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TaskType } from '@crmpro/database';

/** Schedules the next follow-up in the same request (same lead, same owner). */
export class NextFollowUpDto {
  @Type(() => Date)
  @IsDate()
  dueAt: Date;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;
}
