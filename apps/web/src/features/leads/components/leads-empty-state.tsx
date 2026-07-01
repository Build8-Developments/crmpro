import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";

export function LeadsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AppIcons.leads className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No leads yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Import leads or create your first lead to start tracking your pipeline.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/imports">
            <AppIcons.upload className="size-4" />
            Import CSV
          </Link>
        </Button>
        <Button disabled>
          <AppIcons.create className="size-4" />
          Add Lead
        </Button>
      </div>
    </div>
  );
}
