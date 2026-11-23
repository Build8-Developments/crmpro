import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic page placeholder (title, toolbar, rows) shown by route loading
 * states, so a click shows the page's shape immediately instead of a blank.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-5 px-4 py-5 md:px-8" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}
