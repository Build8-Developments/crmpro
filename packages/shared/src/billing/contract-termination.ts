import {
  computeContractAccessEndAt,
  type ContractGraceInput,
} from './contract-grace.util';

/** Mirrors the Prisma enum ContractTerminationMode. */
export const CONTRACT_TERMINATION_MODES = [
  'FULL_ACCESS',
  'READ_ONLY',
  'IMMEDIATE',
] as const;

export type ContractTerminationModeValue =
  (typeof CONTRACT_TERMINATION_MODES)[number];

/**
 * When a terminated contract stops giving access.
 * - FULL_ACCESS / READ_ONLY: contract end + grace days, or termination + grace
 *   days for an open-ended contract (end of that UTC day).
 * - IMMEDIATE: the termination moment.
 */
export function computeTerminationAccessEndsAt(
  mode: ContractTerminationModeValue,
  contract: ContractGraceInput,
  terminatedAt: Date,
): Date {
  if (mode === 'IMMEDIATE') {
    return terminatedAt;
  }

  return (
    computeContractAccessEndAt(
      contract,
      contract.contractEndAt != null ? undefined : terminatedAt,
    ) ?? terminatedAt
  );
}
