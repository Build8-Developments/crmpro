import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { FolderPassword } from './folder-password';

export class SetFolderPasswordDto {
  /** Required to change/remove an existing password unless resetting with file.manage. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  currentPassword?: string;

  /** New password, or null to make the folder public again. */
  @ValidateIf((_, value) => value !== null)
  @FolderPassword()
  newPassword: string | null;
}
