import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Folder passwords are shared secrets, not account passwords: 6+ chars. */
export function FolderPassword() {
  return applyDecorators(IsString(), MinLength(6), MaxLength(128));
}
