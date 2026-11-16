import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class MoveFilesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  fileIds: string[];

  /** Destination folder; null moves the files to the root. */
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  folderId: string | null;
}
