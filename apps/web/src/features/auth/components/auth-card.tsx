"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** Centered card used by the public auth pages (login, reset, invite). */
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
  const t = useTranslations("auth.recovery");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[400px] rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-xs">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight">CRMPro</span>
        </div>
        <h1 className="text-base font-semibold">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
        <div className="mt-5">{children}</div>
        {showBackLink ? (
          <p className="mt-6 text-center text-xs">
            <Link href="/login" className="text-muted-foreground hover:text-foreground hover:underline">
              {t("backToSignIn")}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
