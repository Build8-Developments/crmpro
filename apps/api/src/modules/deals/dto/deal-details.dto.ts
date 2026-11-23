import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** Matches Deal.price / commissionAmount: Decimal(14, 2). */
export const DEAL_MAX_AMOUNT = 999_999_999_999;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * The deal recorded when a lead moves to a Won stage (spec §2.5). Project,
 * unit type and price are what an owner needs; the rest is optional.
 */
export class DealDetailsDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  unitType: string;

  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(50)
  unitCode?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(DEAL_MAX_AMOUNT)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  downPaymentPct?: number;

  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  paymentPlan?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPct?: number;

  /** Typed by hand; otherwise price × commissionPct / 100. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(DEAL_MAX_AMOUNT)
  commissionAmount?: number;

  /** Defaults to the lead owner; anyone else needs lead.assign. */
  @IsOptional()
  @IsUUID()
  agentId?: string;

  /** Defaults to now; can be back-dated, not set in the future. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reservedAt?: Date;

  /** When the contract should be signed (R10); may be in the future. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Date)
  @IsDate()
  expectedContractAt?: Date | null;

  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
