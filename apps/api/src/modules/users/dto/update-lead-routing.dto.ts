import { IsBoolean } from 'class-validator';

export class UpdateLeadRoutingDto {
  @IsBoolean()
  receivesLeads: boolean;
}
