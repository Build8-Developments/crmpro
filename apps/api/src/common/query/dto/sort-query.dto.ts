import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SortOrder } from '../enums/sort-order.enum';

export class SortQueryDto {
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}
