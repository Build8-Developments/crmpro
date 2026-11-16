import { IsString, MaxLength } from 'class-validator';

export class CompleteLogoUploadDto {
  @IsString()
  @MaxLength(500)
  objectKey: string;
}
