import { Transform } from 'class-transformer';
import {
  IsISO31661Alpha2,
  IsInt,
  IsOptional,
  IsString,
  IsTimeZone,
  Matches,
  Max,
  Min,
} from 'class-validator';

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @Transform(upper)
  @IsISO31661Alpha2()
  countryCode?: string;

  @IsOptional()
  @IsString()
  @IsTimeZone()
  timezone?: string;

  /** ISO-4217; checked against the runtime's currency list in the service. */
  @IsOptional()
  @Transform(upper)
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be an ISO-4217 code' })
  currency?: string;

  /** 0 = Sunday … 6 = Saturday. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStartsOn?: number;
}
