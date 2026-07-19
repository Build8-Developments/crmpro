"use client";

import { createLeadExportJob } from "@/features/exports/api";
import type { CreateLeadExportInput } from "@/features/exports/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

export function useCreateLeadExport() {
  return useApiMutation({
    mutationFn: (input: CreateLeadExportInput = {}) =>
      createLeadExportJob(input),
    successMessage: "Export started",
    invalidateKeys: [queryKeys.exports.all()],
  });
}
