import { IsISO8601, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsDateQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsISO8601({}, { message: 'from must be a valid ISO 8601 date' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601({}, { message: 'to must be a valid ISO 8601 date' })
  to?: string;
}
