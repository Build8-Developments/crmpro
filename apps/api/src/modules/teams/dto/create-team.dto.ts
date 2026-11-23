import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { normalizeDisplayName } from '../../../common/utils/name-normalization.util';
import { MAX_TEAM_MEMBERS } from '../teams.constants';

export class CreateTeamDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeDisplayName(value) : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  leaderUserId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TEAM_MEMBERS)
  @IsUUID('all', { each: true })
  memberIds?: string[];
}
