import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePipelineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
