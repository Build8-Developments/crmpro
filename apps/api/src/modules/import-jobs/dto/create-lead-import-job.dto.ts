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
  stageId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}

export class CreateLeadImportJobDto {
  @IsUUID()
  fileAssetId: string;

  /**
   * Lead field → zero-based column index (`cf:<key>` for custom fields).
   * Omitted: columns are matched automatically by header name.
   */
  @IsOptional()
  @IsObject()
  mapping?: Record<string, number>;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportDefaultsDto)
  defaults?: ImportDefaultsDto;

  @IsOptional()
  @IsEnum(ImportDuplicatePolicy)
  duplicatePolicy?: ImportDuplicatePolicy;
}
