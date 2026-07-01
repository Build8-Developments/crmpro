"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function RolesSkeleton() {
  return (
    <div className="space-y-4 px-6 py-4 md:px-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="overflow-hidden rounded-xl border">
        <div className="grid lg:grid-cols-[14rem_1fr]">
          <Skeleton className="h-72 rounded-none" />
          <Skeleton className="h-72 rounded-none" />
        </div>
      </div>
    </div>
  );
}
