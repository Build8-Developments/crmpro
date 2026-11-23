import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSavedViewDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  /** Lead list filters, validated against the list endpoint's own rules. */
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sort?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  display?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

export class UpdateSavedViewDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sort?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  display?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}
