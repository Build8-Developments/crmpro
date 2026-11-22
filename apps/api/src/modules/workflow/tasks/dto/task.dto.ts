import { TaskPriority, TaskStatus, TaskType } from '@crmpro/database';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const TASK_SCOPES = ['mine', 'team'] as const;
export type TaskScope = (typeof TASK_SCOPES)[number];

export const TASK_DUE_FILTERS = [
  'overdue',
  'today',
  'upcoming',
  'all',
] as const;
export type TaskDueFilter = (typeof TASK_DUE_FILTERS)[number];

export class GetTasksQueryDto extends PaginationQueryDto {
  /** `team` (all assignees) needs lead.assign — i.e. managers. */
  @IsOptional()
  @IsIn(TASK_SCOPES)
  scope?: TaskScope;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsIn(TASK_DUE_FILTERS)
  due?: TaskDueFilter;
}

export class CreateTaskDto {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  /** Defaults to the lead owner (or yourself). Others need lead.assign. */
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsEnum(TaskType)
  type: TaskType;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @Type(() => Date)
  @IsDate()
  dueAt: Date;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

export class UpdateTaskDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  /** Required when moving a task later (a snooze); snoozes are counted. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason?: string;
}

export class SkipTaskDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason: string;
}

export class CompleteTaskDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
