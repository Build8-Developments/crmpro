import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../pagination/dto/pagination-query.dto';
import { normalizeSearchInput } from '../utils/search.util';

export class ListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeSearchInput(value))
  @IsString()
  @MaxLength(200)
  search?: string;
}
