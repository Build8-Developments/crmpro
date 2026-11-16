import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  LOGO_ALLOWED_CONTENT_TYPES,
  LOGO_MAX_SIZE_BYTES,
} from '../organization.constants';

export class RequestLogoUploadDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsIn(LOGO_ALLOWED_CONTENT_TYPES, {
    message: 'Logo must be a PNG, JPEG or WebP image',
  })
  contentType: (typeof LOGO_ALLOWED_CONTENT_TYPES)[number];

  @IsInt()
  @Min(1)
  @Max(LOGO_MAX_SIZE_BYTES, { message: 'Logo must be 2 MB or smaller' })
  sizeBytes: number;
}
