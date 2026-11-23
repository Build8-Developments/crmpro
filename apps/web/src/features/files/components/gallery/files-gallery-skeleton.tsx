import { Skeleton } from "@/components/ui/skeleton";

/** Shaped like the gallery (folders · grid · details) so nothing jumps. */
export function FilesGallerySkeleton() {
  return (
    <div className="flex min-h-0 flex-1" aria-busy="true">
      <div className="hidden w-60 shrink-0 space-y-2 border-r border-border/60 p-3 md:block">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-7 w-3/5" />
      </div>
      <div className="flex-1 space-y-3 p-4">
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/3] w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="hidden w-80 shrink-0 space-y-3 border-l border-border/60 p-4 lg:block">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
