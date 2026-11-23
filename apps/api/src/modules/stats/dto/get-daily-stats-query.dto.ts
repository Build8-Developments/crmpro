import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

const LOCAL_DAY = /^\d{4}-\d{2}-\d{2}$/;

export class GetDailyStatsQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'First local day (workspace time zone). Default: to − 29.',
  })
  @IsOptional()
  @Matches(LOCAL_DAY, { message: 'from must be a date (YYYY-MM-DD)' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11-17',
    description: 'Last local day, inclusive. Default: today.',
  })
  @IsOptional()
  @Matches(LOCAL_DAY, { message: 'to must be a date (YYYY-MM-DD)' })
  to?: string;

  @ApiPropertyOptional({ description: 'Only this user (must be in scope).' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Only members of this team.' })
  @IsOptional()
  @IsUUID()
  teamId?: string;
}
