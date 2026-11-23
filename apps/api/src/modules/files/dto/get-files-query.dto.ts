import { FileAssetCategory } from '@crmpro/database';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { ListQueryDto } from '../../../common/query';

export class GetFilesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(FileAssetCategory)
  category?: FileAssetCategory;

  /** Gallery folder id, or `root` for files not in any folder. */
  @IsOptional()
  @Matches(
    /^(root|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
    { message: 'folderId must be a folder id or "root"' },
  )
  folderId?: string;
}
