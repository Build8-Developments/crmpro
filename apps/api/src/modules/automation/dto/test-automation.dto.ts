import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class TestAutomationDto {
  @IsString()
  entityType!: string;

  @IsUUID()
  entityId!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
