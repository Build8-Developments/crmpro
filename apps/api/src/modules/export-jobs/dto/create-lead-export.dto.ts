import { ExportFormat } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SORT_ORDER_VALUES, SortOrder } from '../../../common/query';
import { LeadExportFiltersDto } from './lead-export-filters.dto';

export class CreateLeadExportDto {
  @IsEnum(ExportFormat)
  format: ExportFormat = ExportFormat.CSV;

  @IsOptional()
  @ValidateNested()
  @Type(() => LeadExportFiltersDto)
  filters?: LeadExportFiltersDto;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(SORT_ORDER_VALUES, {
    message: 'sortOrder must be either asc or desc',
  })
  sortOrder?: SortOrder;
}
