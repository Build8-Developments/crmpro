import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { FolderName } from './folder-name';

export class UpdateFolderDto {
  @IsOptional()
  @FolderName()
  name?: string;

  /** New parent folder; null moves it to the root. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  parentId?: string | null;
}
