import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeWhitespace } from '../../../common/utils/name-normalization.util';

export class CreateDeveloperDto {
  @Transform(({ value }) => normalizeWhitespace(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;
}
