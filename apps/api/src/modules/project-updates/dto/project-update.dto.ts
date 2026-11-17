import { ProjectUpdateType } from '@crmpro/database';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProjectUpdateDto {
  @IsOptional()
  @IsEnum(ProjectUpdateType)
  type?: ProjectUpdateType;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  title: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(4000)
  body?: string;

  /** Notify everyone who can read projects (default true). */
  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class ProjectUpdatesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  /** Return updates older than this update (cursor pagination). */
  @IsOptional()
  @IsUUID()
  before?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
