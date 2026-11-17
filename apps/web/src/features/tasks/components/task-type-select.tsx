"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskType } from "@/features/tasks/types";
import { TASK_TYPES } from "@/features/tasks/utils";

export function TaskTypeSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: TaskType;
  onChange: (value: TaskType) => void;
}) {
  const t = useTranslations("tasks.types");

  return (
    <Select value={value} onValueChange={(next) => onChange(next as TaskType)}>
      <SelectTrigger id={id} className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TASK_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {t(type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
