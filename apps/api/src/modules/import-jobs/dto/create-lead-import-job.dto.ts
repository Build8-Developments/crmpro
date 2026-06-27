import { IsUUID } from 'class-validator';

export class CreateLeadImportJobDto {
  @IsUUID()
  fileAssetId: string;
}
