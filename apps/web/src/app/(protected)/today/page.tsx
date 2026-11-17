import { Suspense } from "react";
import { TodayPage } from "@/features/tasks/components/today-page";

export default function TodayRoutePage() {
  return (
    <Suspense fallback={null}>
      <TodayPage />
    </Suspense>
  );
}
