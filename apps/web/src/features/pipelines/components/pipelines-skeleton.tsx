"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function PipelinesSkeleton() {
  return (
    <div className="space-y-4 px-6 py-4 md:px-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="overflow-hidden rounded-xl border">
        <div className="grid lg:grid-cols-[13.5rem_1fr]">
          <Skeleton className="h-64 rounded-none lg:h-80" />
          <Skeleton className="h-64 rounded-none lg:h-80" />
        </div>
      </div>
    </div>
  );
}
