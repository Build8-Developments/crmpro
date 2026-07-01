import { FileAssetCategory } from '@crmpro/database';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../../common/query';

export class GetFilesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(FileAssetCategory)
  category?: FileAssetCategory;
}
