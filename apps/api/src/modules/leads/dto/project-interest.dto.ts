import { InterestLevel } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ProjectInterestDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsEnum(InterestLevel)
  interestLevel?: InterestLevel;
}
