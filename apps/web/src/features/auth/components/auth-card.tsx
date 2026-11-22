"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PRODUCT_NAME, ProductMark } from "@/components/brand/product-logo";

/** The centered card used by the signed-out pages (sign in, reset, invite). */
export function AuthCard({
  title,
  description,
  children,
  showBackLink = true,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  showBackLink?: boolean;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[400px] rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <ProductMark className="size-10" />
          <span className="text-lg font-semibold tracking-tight">{PRODUCT_NAME}</span>
        </div>
        <h1 className="text-base font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        <div className="mt-5">{children}</div>
        {showBackLink ? (
          <p className="mt-6 text-center text-xs">
            <Link href="/login" className="text-muted-foreground hover:text-foreground hover:underline">
              Back to sign in
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
