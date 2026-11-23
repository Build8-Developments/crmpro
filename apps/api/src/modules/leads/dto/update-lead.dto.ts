import { LeadStatus } from '@crmpro/database';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { normalizeWhitespace } from '../../../common/utils/name-normalization.util';
import { LeadProfileFieldsDto } from './lead-profile-fields.dto';
import { ProjectInterestDto } from './project-interest.dto';

export class UpdateLeadDto extends LeadProfileFieldsDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  sourceId?: string | null;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @Transform(({ value }) => normalizeWhitespace(value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  primaryPhone?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value }: { value: unknown }) => {
    if (value === null) {
      return null;
    }
    return typeof value === 'string' ? value.trim() : value;
  })
  @IsString()
  @MinLength(1)
  secondaryPhone?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value }: { value: unknown }) => {
    if (value === null) {
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      return trimmed.length > 0 ? trimmed : null;
    }
    return value;
  })
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectInterestDto)
  projectInterests?: ProjectInterestDto[];

  /**
   * Custom field values keyed by definition key (see /custom-fields).
   * Merged into the stored values; null or "" clears one.
   */
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}
