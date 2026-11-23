import { CustomFieldType } from '@crmpro/database';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmpty,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  CUSTOM_FIELD_DESCRIPTION_MAX_LENGTH,
  CUSTOM_FIELD_KEY_PATTERN,
  CUSTOM_FIELD_LABEL_MAX_LENGTH,
  CUSTOM_FIELD_MAX_OPTIONS,
  CUSTOM_FIELD_OPTION_MAX_LENGTH,
  MAX_ACTIVE_CUSTOM_FIELDS,
} from '../custom-fields.constants';

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

/** Blank description clears it. */
const blankToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Trimmed, blank entries dropped, duplicates removed (first one wins). */
const cleanOptions = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.map((item: unknown) =>
            typeof item === 'string' ? item.trim().replace(/\s+/g, ' ') : item,
          ),
        ),
      ].filter((item) => item !== '')
    : value;

export class CreateCustomFieldDto {
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CUSTOM_FIELD_LABEL_MAX_LENGTH)
  label: string;

  /** Stable key in Lead.customFields; derived from the label when omitted. */
  @IsOptional()
  @IsString()
  @Matches(CUSTOM_FIELD_KEY_PATTERN, {
    message:
      'key must start with a lowercase letter and use only a-z, 0-9 and _ (max 40)',
  })
  key?: string;

  @IsEnum(CustomFieldType)
  type: CustomFieldType;

  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(CUSTOM_FIELD_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  /** Choices for SELECT / MULTI_SELECT (ignored for other types). */
  @IsOptional()
  @Transform(cleanOptions)
  @IsArray()
  @ArrayMaxSize(CUSTOM_FIELD_MAX_OPTIONS)
  @IsString({ each: true })
  @MaxLength(CUSTOM_FIELD_OPTION_MAX_LENGTH, { each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class UpdateCustomFieldDto {
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CUSTOM_FIELD_LABEL_MAX_LENGTH)
  label?: string;

  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(CUSTOM_FIELD_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  /**
   * SELECT / MULTI_SELECT only. Removing an option keeps the values leads
   * already have; it just cannot be picked any more.
   */
  @IsOptional()
  @Transform(cleanOptions)
  @IsArray()
  @ArrayMaxSize(CUSTOM_FIELD_MAX_OPTIONS)
  @IsString({ each: true })
  @MaxLength(CUSTOM_FIELD_OPTION_MAX_LENGTH, { each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  /** Immutable: listed so a change is refused instead of silently dropped. */
  @IsEmpty({ message: 'key cannot be changed after the field is created' })
  key?: never;

  /** Immutable: changing it would orphan the values leads already have. */
  @IsEmpty({ message: 'type cannot be changed after the field is created' })
  type?: never;
}

export class ReorderCustomFieldsDto {
  /** Field ids in their new order (sortOrder = position). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ACTIVE_CUSTOM_FIELDS * 4)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids: string[];
}
