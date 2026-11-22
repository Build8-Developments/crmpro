import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  BULK_ACTION_VALIDATION_MESSAGE,
  MAX_BULK_ACTION_SIZE,
} from '../constants/leads-bulk.constants';
import { LeadSelectionFiltersDto } from './get-leads-query.dto';

/**
 * Which leads a bulk action applies to: an explicit list of ids, or every
 * lead matching `filters` (capped server-side — see MAX_BULK_MATCHING).
 */
export class LeadSelectionDto {
  @ValidateIf((dto: LeadSelectionDto) => dto.filters === undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_ACTION_SIZE, {
    message: BULK_ACTION_VALIDATION_MESSAGE,
  })
  @IsUUID('4', { each: true })
  leadIds?: string[];

  @ValidateIf((dto: LeadSelectionDto) => dto.leadIds === undefined)
  @IsDefined()
  @ValidateNested()
  @Type(() => LeadSelectionFiltersDto)
  filters?: LeadSelectionFiltersDto;
}
