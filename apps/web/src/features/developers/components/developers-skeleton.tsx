"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DevelopersSkeleton() {
  return (
    <div className="space-y-4 px-6 py-4 md:px-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-8 w-full max-w-xs" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
