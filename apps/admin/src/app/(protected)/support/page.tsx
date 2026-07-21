import { Suspense } from "react";
import { SupportPage } from "@/features/support/components/support-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading inbox…</div>
      }
    >
      <SupportPage />
    </Suspense>
  );
}
