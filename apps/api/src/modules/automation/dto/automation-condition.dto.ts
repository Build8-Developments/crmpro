import { AutomationActionType, AutomationConditionOperator } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AutomationConditionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  field!: string;

  @IsEnum(AutomationConditionOperator)
  operator!: AutomationConditionOperator;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  value?: string;
}

export class AutomationActionDto {
  @IsEnum(AutomationActionType)
  actionType!: AutomationActionType;

  @IsObject()
  configuration!: Record<string, unknown>;

  @IsInt()
  @Min(0)
  executionOrder!: number;
}
