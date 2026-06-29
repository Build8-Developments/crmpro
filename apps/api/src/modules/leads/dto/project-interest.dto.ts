import { InterestLevel } from '@crmpro/database';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ProjectInterestDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsEnum(InterestLevel)
  interestLevel?: InterestLevel;
}
