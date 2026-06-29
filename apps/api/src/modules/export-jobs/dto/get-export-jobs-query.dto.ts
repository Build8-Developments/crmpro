import { ExportType, JobStatus } from '@crmpro/database';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../../common/query';

export class GetExportJobsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsEnum(ExportType)
  exportType?: ExportType;
}
