import { Suspense } from "react";
import { AdminsPage } from "@/features/admins/components/admins-page";
import { AdminsSkeleton } from "@/features/admins/components/admins-skeleton";

export default function Page() {
  return (
    <Suspense fallback={<AdminsSkeleton />}>
      <AdminsPage />
    </Suspense>
  );
}
