import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotIn,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  RESERVED_WORKSPACE_PREFIXES,
  SLUG_PATTERN,
  WORKSPACE_PREFIX_MAX_LENGTH,
} from '../constants/tenant-provisioning.constants';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export class CreateTenantDto {
  @IsUUID()
  contractId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name: string;

  /**
   * Workspace address prefix: the tenant's slug and host become
   * `<slug>-<4 random characters>` (see generateWorkspaceSlug).
   */
  @IsString()
  @MinLength(2)
  @MaxLength(WORKSPACE_PREFIX_MAX_LENGTH)
  @Matches(SLUG_PATTERN, {
    message: 'Address must be lowercase letters, numbers and single hyphens',
  })
  @IsNotIn([...RESERVED_WORKSPACE_PREFIXES], {
    message: 'This address is reserved; choose another',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  ownerFullName: string;

  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  ownerEmail: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must include uppercase, lowercase, and a number (8-128 chars)',
  })
  ownerPassword: string;
}
