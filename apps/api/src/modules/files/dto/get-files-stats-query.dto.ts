import { FileAssetCategory } from '@crmpro/database';
import { IsEnum, IsOptional, Matches } from 'class-validator';

/**
 * Scope of the stats: a folder (`folderId`, or `root` for Home's own files),
 * a system category, or nothing for the whole library.
 */
export class GetFilesStatsQueryDto {
  @IsOptional()
  @IsEnum(FileAssetCategory)
  category?: FileAssetCategory;

  @IsOptional()
  @Matches(
    /^(root|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
    { message: 'folderId must be a folder id or "root"' },
  )
  folderId?: string;
}
