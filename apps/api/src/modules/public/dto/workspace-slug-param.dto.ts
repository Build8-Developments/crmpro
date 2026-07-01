import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class WorkspaceSlugParamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug!: string;
}
