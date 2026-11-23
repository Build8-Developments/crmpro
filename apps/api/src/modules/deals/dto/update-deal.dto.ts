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
import { DEAL_MAX_AMOUNT } from './deal-details.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Every field optional; `null` clears an optional field. */
export class UpdateDealDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  unitType?: string;

  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(50)
  unitCode?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(DEAL_MAX_AMOUNT)
  price?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  downPaymentPct?: number | null;

  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  paymentPlan?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPct?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(DEAL_MAX_AMOUNT)
  commissionAmount?: number | null;

  /** Changing who gets the credit needs lead.assign. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  agentId?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reservedAt?: Date;

  /**
   * Reserved deals only: when the contract should be signed (R10). May be in
   * the future; managers are alerted once it passes. Null clears it.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Date)
  @IsDate()
  expectedContractAt?: Date | null;

  /** Only on a contracted deal. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  contractedAt?: Date;

  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ContractDealDto {
  /** Defaults to now. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  contractedAt?: Date;
}

export class CancelDealDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
