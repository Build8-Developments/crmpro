import { LeaderboardMode } from '@crmpro/database';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO31661Alpha2,
  IsInt,
  IsOptional,
  IsString,
  IsTimeZone,
  Matches,
  Max,
  Min,
} from 'class-validator';

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @Transform(upper)
  @IsISO31661Alpha2()
  countryCode?: string;

  @IsOptional()
  @IsString()
  @IsTimeZone()
  timezone?: string;

  /** ISO-4217; checked against the runtime's currency list in the service. */
  @IsOptional()
  @Transform(upper)
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be an ISO-4217 code' })
  currency?: string;

  /** 0 = Sunday … 6 = Saturday. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStartsOn?: number;

  /** Days the team works, 0 = Sunday … 6 = Saturday. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];

  /** Minutes after midnight (600 = 10:00). End must be after start. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60 - 1)
  workdayStartMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  workdayEndMinute?: number;

  /** First call to a new lead within this many working minutes. */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  firstContactSlaMinutes?: number;

  /** Alert the manager after this many (must be more than the SLA). */
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(480)
  escalateAfterMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  dailyInteractionGoal?: number;

  /** What agents see about each other on My performance. */
  @IsOptional()
  @IsEnum(LeaderboardMode)
  leaderboardMode?: LeaderboardMode;
}
