import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { SlaAction } from '@crmpro/database';

export const SUPPORTED_LOCALES = ['ar', 'en'] as const;

export class UpdateTenantSettingsDto {
  /** Display name shown in the app and on the sign-in page (slug never changes). */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  workspaceName?: string;

  /** FileAsset uploaded with category TENANT_LOGO; null removes the logo. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  logoFileAssetId?: string | null;

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
