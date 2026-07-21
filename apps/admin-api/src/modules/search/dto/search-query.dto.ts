import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeSearchInput } from '../../../common/query/utils/search.util';

export class SearchQueryDto {
  @Transform(({ value }) => normalizeSearchInput(value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 8;
  })
  limit?: number = 8;
}
