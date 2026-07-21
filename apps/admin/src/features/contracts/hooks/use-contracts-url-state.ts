"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ContractStatus,
  PaymentFrequency,
  PaymentMethod,
} from "@/features/contracts/types";
import {
  CONTRACT_STATUSES,
  PAYMENT_FREQUENCIES,
  PAYMENT_METHODS,
} from "@/features/contracts/types";

interface UseContractsUrlStateOptions {
  debouncedSearch: string;
  setSearch: (value: string) => void;
  status: ContractStatus | null;
  setStatus: (status: ContractStatus | null) => void;
  planId: string | null;
  setPlanId: (planId: string | null) => void;
  currency: string | null;
  setCurrency: (currency: string | null) => void;
  paymentMethod: PaymentMethod | null;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  paymentFrequency: PaymentFrequency | null;
  setPaymentFrequency: (frequency: PaymentFrequency | null) => void;
  page: number;
  setPage: (page: number) => void;
}

function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null {
  if (!value) return null;
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function parsePage(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function useContractsUrlState({
  debouncedSearch,
  setSearch,
  status,
  setStatus,
  planId,
  setPlanId,
  currency,
  setCurrency,
  paymentMethod,
  setPaymentMethod,
  paymentFrequency,
  setPaymentFrequency,
  page,
  setPage,
}: UseContractsUrlStateOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = searchParams.toString();
    if (!signature || appliedRef.current === signature) {
      return;
    }

    const urlSearch = searchParams.get("search");
    if (urlSearch !== null) {
      setSearch(urlSearch);
    }

    setStatus(parseEnum(searchParams.get("status"), CONTRACT_STATUSES));

    const urlPlanId = searchParams.get("planId");
    if (urlPlanId) {
      setPlanId(urlPlanId);
    }

    const urlCurrency = searchParams.get("currency");
    if (urlCurrency) {
      setCurrency(urlCurrency.toUpperCase());
    }

    setPaymentMethod(
      parseEnum(searchParams.get("paymentMethod"), PAYMENT_METHODS),
    );
    setPaymentFrequency(
      parseEnum(searchParams.get("paymentFrequency"), PAYMENT_FREQUENCIES),
    );

    const urlPage = searchParams.get("page");
    if (urlPage) {
      setPage(parsePage(urlPage));
    }

    appliedRef.current = signature;
  }, [
    searchParams,
    setCurrency,
    setPage,
    setPaymentFrequency,
    setPaymentMethod,
    setPlanId,
    setSearch,
    setStatus,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextSearch = debouncedSearch.trim();

    if (nextSearch) {
      params.set("search", nextSearch);
    } else {
      params.delete("search");
    }

    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }

    if (planId) {
      params.set("planId", planId);
    } else {
      params.delete("planId");
    }

    if (currency) {
      params.set("currency", currency);
    } else {
      params.delete("currency");
    }

    if (paymentMethod) {
      params.set("paymentMethod", paymentMethod);
    } else {
      params.delete("paymentMethod");
    }

    if (paymentFrequency) {
      params.set("paymentFrequency", paymentFrequency);
    } else {
      params.delete("paymentFrequency");
    }

    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [
    currency,
    debouncedSearch,
    page,
    pathname,
    paymentFrequency,
    paymentMethod,
    planId,
    router,
    searchParams,
    status,
  ]);
}
