"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function AuditSkeleton() {
  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-8 w-full max-w-3xl" />
      <div className="overflow-hidden rounded-lg border border-border/70">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
