import {
  ContactChannelPreference,
  ContactTimePreference,
  PaymentPreference,
  PurchasePurpose,
} from '@crmpro/database';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_PROJECT_IDS } from '../inbound.constants';

type TransformInput = { value: unknown };

/** Numbers are accepted for phone-like fields (spreadsheets, Zapier). */
const toTrimmedString = ({ value }: TransformInput) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
};

/** Integrations send "" for unmapped fields: treat it as absent. */
const optionalString = ({ value }: TransformInput) => {
  const normalized = toTrimmedString({ value });
  return normalized === '' || normalized === null ? undefined : normalized;
};

/** "1,500,000" and " 2000000 " are numbers too; blanks are absent. */
const optionalNumber = ({ value }: TransformInput) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;
  const cleaned = value.replace(/[,\s]/g, '');
  if (cleaned === '') return undefined;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? value : parsed;
};

/**
 * Case-insensitive enum ("cash", "Vacation home"); values we don't know are
 * dropped rather than failing the whole lead.
 */
const lenientEnum =
  (values: Record<string, string>) =>
  ({ value }: TransformInput) => {
    if (typeof value !== 'string') return undefined;
    const key = value
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
    return Object.values(values).includes(key) ? key : undefined;
  };

const optionalStringArray = ({ value }: TransformInput) => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'string') {
    // "id1, id2" from no-code tools.
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
};

/** Lead pushed by a website form, Zapier/Make or an ad platform. */
export class InboundLeadDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  phone: string;

  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(32)
  secondaryPhone?: string;

  @IsOptional()
  @Transform(optionalString)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  /** Free text from the form ("I want a 3-bedroom in New Cairo"). */
  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @Transform(optionalStringArray)
  @IsArray()
  @ArrayMaxSize(MAX_PROJECT_IDS)
  @IsUUID('all', { each: true })
  projectIds?: string[];

  /** Matched case-insensitively against project names; unknown names are ignored. */
  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(160)
  projectName?: string;

  /** Lead source name; only used when the key has no source. Unknown names are ignored. */
  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(80)
  source?: string;

  /** Your id for this lead (e.g. the Meta lead id). Re-sends are idempotent. */
  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(200)
  externalId?: string;

  @IsOptional()
  @Transform(optionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000_000)
  budgetMin?: number;

  @IsOptional()
  @Transform(optionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000_000)
  budgetMax?: number;

  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(120)
  occupation?: string;

  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(120)
  residenceArea?: string;

  @IsOptional()
  @Transform(lenientEnum(PaymentPreference))
  @IsEnum(PaymentPreference)
  paymentPreference?: PaymentPreference;

  @IsOptional()
  @Transform(lenientEnum(ContactChannelPreference))
  @IsEnum(ContactChannelPreference)
  contactChannelPreference?: ContactChannelPreference;

  @IsOptional()
  @Transform(lenientEnum(ContactTimePreference))
  @IsEnum(ContactTimePreference)
  contactTimePreference?: ContactTimePreference;

  @IsOptional()
  @Transform(lenientEnum(PurchasePurpose))
  @IsEnum(PurchasePurpose)
  purchasePurpose?: PurchasePurpose;

  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(200)
  utmSource?: string;

  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(200)
  utmMedium?: string;

  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(200)
  utmCampaign?: string;

  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(200)
  utmTerm?: string;

  @IsOptional()
  @Transform(optionalString)
  @IsString()
  @MaxLength(200)
  utmContent?: string;
}
