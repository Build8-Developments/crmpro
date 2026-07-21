import { Suspense } from "react";
import { AuditLogsPage } from "@/features/audit/components/audit-logs-page";
import { AuditSkeleton } from "@/features/audit/components/audit-skeleton";

export default function Page() {
  return (
    <Suspense fallback={<AuditSkeleton />}>
      <AuditLogsPage />
    </Suspense>
  );
}
