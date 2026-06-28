import { AutomationTriggerType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  AutomationActionDto,
  AutomationConditionDto,
} from './automation-condition.dto';

export class CreateAutomationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(AutomationTriggerType)
  trigger!: AutomationTriggerType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationConditionDto)
  conditions!: AutomationConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  actions!: AutomationActionDto[];
}
