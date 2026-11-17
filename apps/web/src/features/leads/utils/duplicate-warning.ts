import type { DuplicateMatch, DuplicateWarning } from "@/features/leads/types";
import { toast } from "@/lib/toast";

type DuplicateTranslator = (
  key: "title" | "ownedBy" | "hiddenOwnedBy" | "hiddenUnassigned",
  values?: Record<string, string>,
) => string;

function describeMatch(match: DuplicateMatch, t: DuplicateTranslator): string {
  if (match.accessible && match.fullName) {
    return match.ownerName
      ? t("ownedBy", { name: match.fullName, owner: match.ownerName })
      : match.fullName;
  }

  // Leads outside the user's scope only reveal who owns them.
  return match.ownerName
    ? t("hiddenOwnedBy", { owner: match.ownerName })
    : t("hiddenUnassigned");
}

export function notifyDuplicateWarning(
  duplicateWarning: DuplicateWarning | null | undefined,
  t: DuplicateTranslator,
): void {
  if (!duplicateWarning?.detected || duplicateWarning.matches.length === 0) {
    return;
  }

  const descriptions = duplicateWarning.matches
    .map((match) => describeMatch(match, t))
    .join(", ");
  toast.info(t("title"), descriptions);
}
