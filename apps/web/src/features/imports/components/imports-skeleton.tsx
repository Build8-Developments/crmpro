export function ImportsSkeleton() {
  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="space-y-2">
        <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/50 px-4 py-3">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="space-y-3 px-4 py-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
