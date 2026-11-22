import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DealDetailsDto } from '../../deals/dto/deal-details.dto';

export class MoveStageDto {
  @IsUUID()
  pipelineStageId: string;

  /** Required when the target stage is a LOST stage. */
  @IsOptional()
  @IsUUID()
  lostReasonId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  lostNote?: string;

  /** Required when the target stage is a WON stage (spec §2.5). */
  @IsOptional()
  @ValidateNested()
  @Type(() => DealDetailsDto)
  deal?: DealDetailsDto;
}
