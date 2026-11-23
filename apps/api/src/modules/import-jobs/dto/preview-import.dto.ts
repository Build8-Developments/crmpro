import { IsUUID } from 'class-validator';

export class PreviewImportDto {
  @IsUUID()
  fileAssetId: string;
}
