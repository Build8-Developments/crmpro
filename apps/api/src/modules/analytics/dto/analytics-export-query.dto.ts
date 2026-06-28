import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ANALYTICS_EXPORT_FORMATS } from '../analytics.constants';
import { AnalyticsDateQueryDto } from './analytics-date-query.dto';

export class AnalyticsExportQueryDto extends AnalyticsDateQueryDto {
  @ApiProperty({
    enum: ANALYTICS_EXPORT_FORMATS,
    example: 'CSV',
    description: 'Dashboard export format',
  })
  @IsEnum(ANALYTICS_EXPORT_FORMATS, {
    message: `format must be one of: ${ANALYTICS_EXPORT_FORMATS.join(', ')}`,
  })
  format!: (typeof ANALYTICS_EXPORT_FORMATS)[number];

  @ApiPropertyOptional({
    enum: ANALYTICS_EXPORT_FORMATS,
    deprecated: true,
    description: 'Alias for format',
  })
  @IsOptional()
  @IsEnum(ANALYTICS_EXPORT_FORMATS)
  type?: (typeof ANALYTICS_EXPORT_FORMATS)[number];
}
