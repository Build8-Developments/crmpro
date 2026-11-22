import { Transform } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { FOLDER_NAME_MAX_LENGTH } from '../folders.constants';

/** Trimmed, single-spaced folder name without path separators. */
export function FolderName() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
    ),
    IsString(),
    MinLength(1),
    MaxLength(FOLDER_NAME_MAX_LENGTH),
    Matches(/^[^/\\]+$/, { message: 'Folder names cannot contain / or \\' }),
  );
}
