import { IsOptional, IsUUID } from 'class-validator';
import { FolderName } from './folder-name';
import { FolderPassword } from './folder-password';

export class CreateFolderDto {
  @FolderName()
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  /** Makes the folder private from the start. */
  @IsOptional()
  @FolderPassword()
  password?: string;
}
