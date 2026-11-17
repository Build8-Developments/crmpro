import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { SlaAction } from '@crmpro/database';

export const SUPPORTED_LOCALES = ['ar', 'en'] as const;

export class UpdateTenantSettingsDto {
  /** IANA zone, e.g. Africa/Cairo, Asia/Riyadh, Asia/Dubai. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+$|^UTC$/)
  timezone?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{2}$/)
  defaultCountryCode?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  defaultLocale?: string;

  @IsOptional()
  @IsBoolean()
  autoAssignEnabled?: boolean;

  /** null turns the SLA off. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(7 * 24 * 60)
  slaFirstResponseMinutes?: number | null;

  @IsOptional()
  @IsEnum(SlaAction)
  slaAction?: SlaAction;
}
