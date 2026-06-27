import { IsUUID } from 'class-validator';

export class AttachFileToLeadDto {
  @IsUUID()
  leadId: string;
}
