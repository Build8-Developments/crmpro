import { IsDefined, IsUUID, ValidateIf } from 'class-validator';
import { LeadSelectionDto } from './lead-selection.dto';

export class BulkAssignLeadsDto extends LeadSelectionDto {
  @IsDefined()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  userId: string | null;
}
