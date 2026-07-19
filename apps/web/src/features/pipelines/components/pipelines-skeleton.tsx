"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function PipelinesSkeleton() {
  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="grid h-[min(42rem,calc(100vh-10.5rem))] lg:grid-cols-[15rem_1fr]">
          <div className="space-y-2 border-r border-border/50 bg-muted/20 p-3">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
