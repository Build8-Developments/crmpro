"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function FilesSkeleton() {
  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="space-y-3 border-b border-border/50 px-4 py-3">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-7 w-16" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-border/40 px-3 py-2 last:border-b-0"
          >
            <Skeleton className="size-8 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
