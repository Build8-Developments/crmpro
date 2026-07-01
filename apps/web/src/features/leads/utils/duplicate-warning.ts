import type { DuplicateWarning } from "@/features/leads/types";
import { toast } from "@/lib/toast";

export function notifyDuplicateWarning(
  duplicateWarning: DuplicateWarning | null | undefined,
): void {
  if (!duplicateWarning?.detected || duplicateWarning.matches.length === 0) {
    return;
  }

  const names = duplicateWarning.matches.map((match) => match.fullName).join(", ");
  toast.info(`Possible duplicate lead: ${names}`);
}
