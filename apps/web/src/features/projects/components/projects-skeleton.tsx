"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsSkeleton() {
  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="space-y-3 border-b border-border/50 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-full max-w-xs" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="ml-auto h-8 w-28" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
        <div className="space-y-0">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0"
            >
              <Skeleton className="size-8 rounded-md" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="ml-auto h-3.5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
