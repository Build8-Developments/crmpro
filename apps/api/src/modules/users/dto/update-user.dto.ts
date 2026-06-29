import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeDisplayName } from '../../../common/utils/name-normalization.util';

export class UpdateUserDto {
  @Transform(({ value }) => normalizeDisplayName(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;
}
