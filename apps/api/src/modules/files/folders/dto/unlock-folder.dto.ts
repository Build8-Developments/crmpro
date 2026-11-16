import { IsString, MaxLength, MinLength } from 'class-validator';

export class UnlockFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
