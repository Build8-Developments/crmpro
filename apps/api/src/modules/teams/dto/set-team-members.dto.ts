import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';
import { MAX_TEAM_MEMBERS } from '../teams.constants';

export class SetTeamMembersDto {
  @IsArray()
  @ArrayMaxSize(MAX_TEAM_MEMBERS)
  @IsUUID('all', { each: true })
  userIds: string[];
}
