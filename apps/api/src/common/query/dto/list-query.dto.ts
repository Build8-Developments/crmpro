import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../pagination/dto/pagination-query.dto';
import { SortOrder } from '../enums/sort-order.enum';
import { normalizeSearchInput } from '../utils/search.util';

export class ListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeSearchInput(value))
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}
