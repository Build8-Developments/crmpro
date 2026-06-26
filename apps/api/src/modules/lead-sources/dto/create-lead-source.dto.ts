import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeWhitespace } from '../../../common/utils/name-normalization.util';

export class CreateLeadSourceDto {
  @Transform(({ value }) => normalizeWhitespace(value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}
