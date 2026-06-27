import { IsDefined, IsUUID, ValidateIf } from 'class-validator';

export class AssignLeadDto {
  @IsDefined()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  userId: string | null;
}
