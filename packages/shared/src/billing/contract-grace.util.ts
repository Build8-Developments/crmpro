export type ContractGraceInput = {
  contractEndAt: Date | string | null;
  gracePeriodDays?: number | null;
};

/**
 * Last moment the tenant may operate under this contract (end of grace day, UTC).
 *
 * Uses contractEndAt when set; otherwise referenceDate (e.g. termination time).
 * Returns null for open-ended contracts with no reference date.
 */
export function computeContractAccessEndAt(
  input: ContractGraceInput,
  referenceDate?: Date | string | null,
): Date | null {
  const graceDays = input.gracePeriodDays ?? 0;

  let base: Date | null = null;

  if (input.contractEndAt != null) {
    base = new Date(input.contractEndAt);
  } else if (referenceDate != null) {
    base = new Date(referenceDate);
  }

  if (!base || Number.isNaN(base.getTime())) {
    return null;
  }

  const accessEnd = new Date(base);
  accessEnd.setUTCDate(accessEnd.getUTCDate() + graceDays);
  accessEnd.setUTCHours(23, 59, 59, 999);

  return accessEnd;
}

export function isWithinContractGrace(
  input: ContractGraceInput,
  options?: { now?: Date; referenceDate?: Date | string | null },
): boolean {
  const referenceDate =
    input.contractEndAt != null ? undefined : options?.referenceDate;

  const accessEnd = computeContractAccessEndAt(input, referenceDate);

  if (!accessEnd) {
    return true;
  }

  const now = options?.now ?? new Date();
  return now.getTime() <= accessEnd.getTime();
}
