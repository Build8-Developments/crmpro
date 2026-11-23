import type { DuplicateWarning } from "@/features/leads/types";
import { toast } from "@/lib/toast";

export function notifyDuplicateWarning(
  duplicateWarning: DuplicateWarning | null | undefined,
): void {
  if (!duplicateWarning?.detected || duplicateWarning.matches.length === 0) {
    return;
  }

  const visible = duplicateWarning.matches
    .filter((match) => match.visible && match.fullName)
    .map((match) => match.fullName as string);
  // Leads you can't see only reveal who is handling them.
  const handlers = [
    ...new Set(
      duplicateWarning.matches
        .filter((match) => !match.visible)
        .map((match) => match.assigneeName ?? "another colleague"),
    ),
  ];

  const parts: string[] = [];
  if (visible.length > 0) parts.push(`Possible duplicate lead: ${visible.join(", ")}`);
  if (handlers.length > 0) {
    parts.push(
      `This phone already belongs to a lead handled by ${handlers.join(", ")}`,
    );
  }
  toast.info(parts.join(". "));
}
