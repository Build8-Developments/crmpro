import { STAGE_ICON_KEYS } from '@crmpro/shared/leads';
import { PipelineCloseType } from '@crmpro/database';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  STAGE_RULE_DAYS_MAX,
  STAGE_RULE_DAYS_MIN,
} from '../types/pipeline.types';

export class CreateStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  sortOrder: number;

  @IsOptional()
  @IsString()
  color?: string;

  /** Stage icon key (see STAGE_ICON_KEYS); null clears it. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(STAGE_ICON_KEYS)
  icon?: string | null;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ValidateIf((dto: CreateStageDto) => dto.isClosed === true)
  @IsEnum(PipelineCloseType)
  closeType?: PipelineCloseType;

  /**
   * R8: revive a lead after this many days without contact. Null turns the
   * rule off; omitted defaults to 7 for open stages. Closed stages never use
   * R8/R9 (both are stored as null).
   */
  @IsOptional()
  @IsInt()
  @Min(STAGE_RULE_DAYS_MIN)
  @Max(STAGE_RULE_DAYS_MAX)
  staleAfterDays?: number | null;

  /** R9: flag for manager review after this many days in the stage. */
  @IsOptional()
  @IsInt()
  @Min(STAGE_RULE_DAYS_MIN)
  @Max(STAGE_RULE_DAYS_MAX)
  stuckAfterDays?: number | null;
}
