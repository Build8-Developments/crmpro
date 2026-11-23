import {
  ContactChannelPreference,
  ContactTimePreference,
  PaymentPreference,
  PurchasePurpose,
} from '@crmpro/database';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** Empty strings clear the field. */
const blankToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Client profile fields shared by create and update. All optional; `null`
 * clears a value on update.
 */
export class LeadProfileFieldsDto {
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  occupation?: string | null;

  /** Where the client lives now, e.g. "Nasr City, Cairo". */
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  residenceArea?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(PaymentPreference)
  paymentPreference?: PaymentPreference | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(ContactChannelPreference)
  contactChannelPreference?: ContactChannelPreference | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(ContactTimePreference)
  contactTimePreference?: ContactTimePreference | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(PurchasePurpose)
  purchasePurpose?: PurchasePurpose | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000_000)
  budgetMin?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000_000)
  budgetMax?: number | null;
}

export const LEAD_PROFILE_KEYS = [
  'occupation',
  'residenceArea',
  'paymentPreference',
  'contactChannelPreference',
  'contactTimePreference',
  'purchasePurpose',
  'budgetMin',
  'budgetMax',
] as const satisfies ReadonlyArray<keyof LeadProfileFieldsDto>;
