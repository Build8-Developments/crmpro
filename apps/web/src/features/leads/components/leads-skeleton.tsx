import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROWS = 8;

export function LeadsSkeleton() {
  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3.5 w-52" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="space-y-3 border-b border-border/50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-full max-w-xs" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="ml-auto h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-14 rounded-md" />
          </div>
        </div>

        <div className="space-y-0">
          <div className="flex gap-3 border-b border-border/50 bg-muted/25 px-3 py-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-16" />
            ))}
          </div>
          {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="flex items-center gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0"
            >
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
