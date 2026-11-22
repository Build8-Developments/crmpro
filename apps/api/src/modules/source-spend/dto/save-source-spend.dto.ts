import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PERIOD_PATTERN } from '../../../common/utils/month-period.util';
import {
  MAX_SPEND_AMOUNT,
  MAX_SPEND_ENTRIES,
  MAX_SPEND_NOTE_LENGTH,
} from '../source-spend.constants';

const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export class SourceSpendEntryDto {
  @IsUUID()
  sourceId: string;

  @Matches(PERIOD_PATTERN, { message: 'period must be YYYY-MM' })
  period: string;

  /** Spend in the workspace currency, or null to clear the month. */
  @ValidateIf((entry: SourceSpendEntryDto) => entry.amount !== null)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_SPEND_AMOUNT)
  amount: number | null;

  /** Omitted keeps the current note; null or blank clears it. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(MAX_SPEND_NOTE_LENGTH)
  note?: string | null;
}

export class SaveSourceSpendDto {
  @IsArray()
  @ArrayMaxSize(MAX_SPEND_ENTRIES)
  @ValidateNested({ each: true })
  @Type(() => SourceSpendEntryDto)
  entries: SourceSpendEntryDto[];
}
