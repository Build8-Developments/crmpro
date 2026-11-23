import { CONTACT_ACCESS_ACTIONS, CONTACT_FIELDS } from '@crmpro/shared/leads';
import type { ContactAccessAction, ContactField } from '@crmpro/shared/leads';
import { IsIn } from 'class-validator';

export class ContactAccessDto {
  @IsIn(CONTACT_FIELDS)
  field: ContactField;

  @IsIn(CONTACT_ACCESS_ACTIONS)
  action: ContactAccessAction;
}
