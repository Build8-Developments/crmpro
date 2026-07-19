"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function RolesSkeleton() {
  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3.5 w-52" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="grid h-[min(42rem,calc(100vh-10.5rem))] lg:grid-cols-[15rem_1fr]">
          <div className="space-y-1.5 border-r border-border/50 bg-muted/15 p-2">
            <Skeleton className="mb-2 h-8 w-full" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-64" />
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
