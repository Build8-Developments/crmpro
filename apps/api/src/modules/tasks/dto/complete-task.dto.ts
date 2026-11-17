import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { NextFollowUpDto } from './next-follow-up.dto';

export class CompleteTaskDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NextFollowUpDto)
  nextFollowUp?: NextFollowUpDto;
}
