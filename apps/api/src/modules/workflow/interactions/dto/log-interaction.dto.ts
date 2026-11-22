import {
  InteractionChannel,
  InteractionDirection,
  InteractionOutcome,
  TaskPriority,
  TaskType,
} from '@crmpro/database';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class NextStepDto {
  @IsEnum(TaskType)
  type: TaskType;

  @Type(() => Date)
  @IsDate()
  dueAt: Date;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

/** A file already PUT to storage via /files/request-upload. */
export class EvidenceUploadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  objectKey: string;
}

export class LogInteractionDto {
  @IsEnum(InteractionChannel)
  channel: InteractionChannel;

  @IsOptional()
  @IsEnum(InteractionDirection)
  direction?: InteractionDirection;

  @IsEnum(InteractionOutcome)
  outcome: InteractionOutcome;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8 * 60 * 60)
  durationSeconds?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** Defaults to now; may be back-dated up to 48 hours. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;

  /** The task this interaction completes, when started from a task. */
  @IsOptional()
  @IsUUID()
  taskId?: string;

  /**
   * Optional evidence (reservation form, signed offer, ID copy…). Each file
   * becomes a lead attachment linked to this interaction.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => EvidenceUploadDto)
  evidence?: EvidenceUploadDto[];

  /** Required on open leads unless the outcome closes the lead (spec §3.2 R4). */
  @IsOptional()
  @ValidateNested()
  @Type(() => NextStepDto)
  nextStep?: NextStepDto;
}
