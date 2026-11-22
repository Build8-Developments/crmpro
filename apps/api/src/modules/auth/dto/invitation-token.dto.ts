import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** The invitation token is sent in the body, never in a URL path. */
export class InvitationTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token: string;
}
