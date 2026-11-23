import { Suspense } from "react";
import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/features/auth/components/forgot-password-page";

// Links carry single-use tokens: never leak them through the Referer header.
export const metadata: Metadata = { referrer: "no-referrer" };

export default function Page() {
  return (
    <Suspense>
      <ForgotPasswordPage />
    </Suspense>
  );
}
