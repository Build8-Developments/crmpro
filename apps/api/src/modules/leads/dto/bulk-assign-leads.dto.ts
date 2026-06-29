import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import {
  BULK_ACTION_VALIDATION_MESSAGE,
  MAX_BULK_ACTION_SIZE,
} from '../constants/leads-bulk.constants';

export class BulkAssignLeadsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_ACTION_SIZE, {
    message: BULK_ACTION_VALIDATION_MESSAGE,
  })
  @IsUUID('4', { each: true })
  leadIds: string[];

  @IsDefined()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  userId: string | null;
}
