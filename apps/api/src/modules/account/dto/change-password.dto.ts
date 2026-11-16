import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_PATTERN } from '../../users/users.constants';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must include uppercase, lowercase, and a number (8-128 chars)',
  })
  newPassword: string;
}
