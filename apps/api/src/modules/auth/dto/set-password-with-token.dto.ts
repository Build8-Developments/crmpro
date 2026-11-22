import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_PATTERN } from '../../users/users.constants';

/** Used by both reset-password and accept-invite. */
export class SetPasswordWithTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must include uppercase, lowercase, and a number (8-128 chars)',
  })
  password: string;
}
