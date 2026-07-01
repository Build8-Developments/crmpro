"use client";

import type { Developer } from "@/features/developers/types";
import { AppIcons } from "@/components/icons/app-icons";

interface DeveloperDuplicateHintProps {
  duplicate: Developer | null;
}

export function DeveloperDuplicateHint({ duplicate }: DeveloperDuplicateHintProps) {
  if (!duplicate) {
    return null;
  }

  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
      <AppIcons.alertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>
        A developer named &quot;{duplicate.name}&quot; already exists.
      </span>
    </p>
  );
}
