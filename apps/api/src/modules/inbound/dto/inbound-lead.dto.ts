import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === ''
    ? undefined
    : trim({ value });

/** Payload accepted from website forms, Zapier/Make and ad platforms. */
export class InboundLeadDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  phone: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(32)
  secondaryPhone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  email?: string;

  /** Lead source name, e.g. "Facebook Ads"; created if it doesn't exist. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  source?: string;

  /** Project name the lead asked about (matched case-insensitively). */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  project?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1e12)
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1e12)
  budgetMax?: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  note?: string;

  /** Campaign / ad name, kept on the timeline. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  campaign?: string;

  /** Your system's id for this lead; repeats are answered idempotently. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  externalId?: string;

  /** Extra key/values (utm_*, form answers); stored on the timeline. */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
