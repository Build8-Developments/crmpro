import { Suspense } from "react";
import type { Metadata } from "next";
import { AcceptInvitePage } from "@/features/auth/components/accept-invite-page";

// Links carry single-use tokens: never leak them through the Referer header.
export const metadata: Metadata = { referrer: "no-referrer" };

export default function Page() {
  return (
    <Suspense>
      <AcceptInvitePage />
    </Suspense>
  );
}
