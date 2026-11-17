import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CustomFieldType } from '@crmpro/database';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimList = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? [
        ...new Set(
          (value as unknown[]).map((item) =>
            typeof item === 'string' ? item.trim() : item,
          ),
        ),
      ].filter((item) => item !== '')
    : value;

export class CreateCustomFieldDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label: string;

  /** Stable machine key; generated from the label when omitted. */
  @IsOptional()
  @Matches(/^[a-z][a-z0-9_]{1,39}$/, {
    message: 'key must be lowercase letters, digits or _ (2-40 chars)',
  })
  key?: string;

  @IsEnum(CustomFieldType)
  type: CustomFieldType;

  @IsOptional()
  @Transform(trimList)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class UpdateCustomFieldDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @Transform(trimList)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ReorderCustomFieldsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];
}
