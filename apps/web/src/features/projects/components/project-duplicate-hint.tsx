"use client";

import type { Project } from "@/features/projects/types";
import { AppIcons } from "@/components/icons/app-icons";

interface ProjectDuplicateHintProps {
  duplicate: Project | null;
}

export function ProjectDuplicateHint({ duplicate }: ProjectDuplicateHintProps) {
  if (!duplicate) {
    return null;
  }

  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-500">
      <AppIcons.alertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>
        A project named &quot;{duplicate.name}&quot; already exists.
      </span>
    </p>
  );
}
