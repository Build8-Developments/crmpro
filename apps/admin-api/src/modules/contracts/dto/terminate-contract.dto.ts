import { Transform } from 'class-transformer';
import { ContractTerminationMode } from '@crmpro/database';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class TerminateContractDto {
  /** What the workspace keeps until access ends (see ContractTerminationMode). */
  @IsEnum(ContractTerminationMode)
  mode: ContractTerminationMode;

  /** Why the contract ended; kept in the audit log. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason?: string;
}
