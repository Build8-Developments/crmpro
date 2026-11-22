import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { normalizeDisplayName } from '../../../common/utils/name-normalization.util';

export class UpdateMeDto {
  @IsOptional()
  @Transform(({ value }) => normalizeDisplayName(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  /** Empty string or null clears the phone. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(30)
  phone?: string | null;
}
