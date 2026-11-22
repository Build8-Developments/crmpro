import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { LeadSelectionDto } from './lead-selection.dto';

export class BulkMoveStageDto extends LeadSelectionDto {
  @IsUUID('4')
  targetStageId: string;

  /** Required when the target stage is a LOST stage. */
  @IsOptional()
  @IsUUID('4')
  lostReasonId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  lostNote?: string;
}
