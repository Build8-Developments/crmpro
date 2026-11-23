import { ImportDuplicatePolicy } from '@crmpro/database';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/** Applied to every row; a mapped column value wins over the default. */
export class ImportDefaultsDto {
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @IsOptional()
  @IsUUID()
  pipelineStageId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** Requires lead.assign. */
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}

export class CreateLeadImportJobDto {
  @IsUUID()
  fileAssetId: string;

  /**
   * File header → lead field key (null or "ignore" = not imported).
   * Omitted: columns are matched automatically by header name.
   */
  @IsOptional()
  @IsObject()
  mapping?: Record<string, string | null>;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportDefaultsDto)
  defaults?: ImportDefaultsDto;

  /** SKIP (default): rows whose phone already exists are skipped. */
  @IsOptional()
  @IsEnum(ImportDuplicatePolicy)
  duplicatePolicy?: ImportDuplicatePolicy;
}
