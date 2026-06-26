import { PipelineCloseType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  sortOrder: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ValidateIf((dto: CreateStageDto) => dto.isClosed === true)
  @IsEnum(PipelineCloseType)
  closeType?: PipelineCloseType;
}
