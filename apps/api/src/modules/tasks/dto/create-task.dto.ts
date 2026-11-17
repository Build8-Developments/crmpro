import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TaskType } from '@crmpro/database';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTaskDto {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  /** Defaults to a title derived from the type. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @Type(() => Date)
  @IsDate()
  dueAt: Date;

  /** Defaults to the actor. */
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}
