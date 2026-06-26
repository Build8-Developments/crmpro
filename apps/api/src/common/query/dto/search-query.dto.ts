import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { normalizeSearchInput } from '../utils/search.util';

export class SearchQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeSearchInput(value))
  @IsString()
  @MaxLength(200)
  search?: string;
}
