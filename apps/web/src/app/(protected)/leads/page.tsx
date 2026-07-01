import { Suspense } from "react";
import { LeadsPage } from "@/features/leads/components/leads-page";
import { LeadsSkeleton } from "@/features/leads/components/leads-skeleton";

export default function LeadsRoutePage() {
  return (
    <Suspense fallback={<LeadsSkeleton />}>
      <LeadsPage />
    </Suspense>
  );
}
