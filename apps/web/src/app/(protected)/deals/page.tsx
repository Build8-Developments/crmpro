import { Suspense } from "react";
import { DealsPage } from "@/features/deals/components/deals-page";

export default function DealsRoutePage() {
  // The lead drawer reads search params, so the page sits in a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <DealsPage />
    </Suspense>
  );
}
