import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeDisplayName } from '../../../common/utils/name-normalization.util';
import { PASSWORD_PATTERN } from '../users.constants';

export class CreateUserDto {
  @Transform(({ value }) => normalizeDisplayName(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must include uppercase, lowercase, and a number (8-128 chars)',
  })
  password: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
