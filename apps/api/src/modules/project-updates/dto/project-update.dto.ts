import { ProjectUpdateType } from '@crmpro/database';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  PROJECT_UPDATE_BODY_MAX,
  PROJECT_UPDATE_TITLE_MAX,
  PROJECT_UPDATES_MAX_LIMIT,
  PROJECT_UPDATES_MAX_PROJECT_IDS,
  PROJECT_UPDATES_MAX_SINCE_DAYS,
} from '../project-updates.constants';

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** Trimmed text; an empty string clears the field (becomes null). */
function trimOrNull({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** `a,b` or repeated `?projectIds=a&projectIds=b`. */
function parseList({ value }: { value: unknown }): unknown {
  const raw: unknown = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(raw)) return raw;
  return (raw as unknown[])
    .flatMap((item): unknown[] =>
      typeof item === 'string' ? item.split(',') : [item],
    )
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => item !== '');
}

export class CreateProjectUpdateDto {
  @IsOptional()
  @IsEnum(ProjectUpdateType)
  type?: ProjectUpdateType;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_UPDATE_TITLE_MAX)
  title: string;

  @IsOptional()
  @Transform(trimOrNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(PROJECT_UPDATE_BODY_MAX)
  body?: string | null;
}

export class UpdateProjectUpdateDto {
  @IsOptional()
  @IsEnum(ProjectUpdateType)
  type?: ProjectUpdateType;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_UPDATE_TITLE_MAX)
  title?: string;

  /** `null` (or an empty string) removes the body. */
  @IsOptional()
  @Transform(trimOrNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(PROJECT_UPDATE_BODY_MAX)
  body?: string | null;
}

export class ProjectUpdatesPageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PROJECT_UPDATES_MAX_LIMIT)
  limit?: number;

  /** `nextCursor` of the previous page: returns the updates after it. */
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

export const PROJECT_UPDATES_FEED_SCOPES = ['all', 'mine'] as const;
export type ProjectUpdatesFeedScope =
  (typeof PROJECT_UPDATES_FEED_SCOPES)[number];

export class ProjectUpdatesFeedQueryDto extends ProjectUpdatesPageQueryDto {
  @IsOptional()
  @Transform(parseList)
  @IsArray()
  @ArrayMaxSize(PROJECT_UPDATES_MAX_PROJECT_IDS)
  @IsUUID(undefined, { each: true })
  projectIds?: string[];

  /**
   * `mine`: only projects the caller is selling — an open lead of theirs is
   * interested in it, or they have a live deal on it. Default `all`.
   */
  @IsOptional()
  @IsIn(PROJECT_UPDATES_FEED_SCOPES)
  scope?: ProjectUpdatesFeedScope;

  /** Only updates posted in the last N days. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PROJECT_UPDATES_MAX_SINCE_DAYS)
  sinceDays?: number;
}
