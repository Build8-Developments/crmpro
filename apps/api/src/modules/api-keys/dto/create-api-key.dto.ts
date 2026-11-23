import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const blankToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateApiKeyDto {
  /** What the key is for, e.g. "Website form" or "Zapier – Meta Lead Ads". */
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  /** Leads sent with this key get this source (overrides the payload). */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID()
  sourceId?: string;
}
