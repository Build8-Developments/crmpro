"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AuditActionFilter, AuditEntityTypeFilter } from "@/features/audit/types";

interface UseAuditUrlStateOptions {
  actorUserId: string | null;
  setActorUserId: (userId: string | null) => void;
  entityTypeFilter: AuditEntityTypeFilter;
  setEntityTypeFilter: (filter: AuditEntityTypeFilter) => void;
  actionFilter: AuditActionFilter;
  setActionFilter: (filter: AuditActionFilter) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  selectedLogId: string | null;
  openDrawer: (logId: string) => void;
}

function parseEntityType(value: string | null): AuditEntityTypeFilter {
  const options: AuditEntityTypeFilter[] = [
    "User",
    "Role",
    "FileAsset",
    "ImportJob",
    "ExportJob",
    "LeadBulkAction",
  ];
  return options.includes(value as AuditEntityTypeFilter)
    ? (value as AuditEntityTypeFilter)
    : "all";
}

export function useAuditUrlState({
  actorUserId,
  setActorUserId,
  entityTypeFilter,
  setEntityTypeFilter,
  actionFilter,
  setActionFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  selectedLogId,
  openDrawer,
}: UseAuditUrlStateOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = searchParams.toString();
    if (!signature || appliedRef.current === signature) {
      return;
    }

    const urlActorUserId = searchParams.get("actorUserId");
    if (urlActorUserId) {
      setActorUserId(urlActorUserId);
    }

    const urlEntityType = searchParams.get("entityType");
    if (urlEntityType) {
      setEntityTypeFilter(parseEntityType(urlEntityType));
    }

    const urlAction = searchParams.get("action");
    if (urlAction) {
      setActionFilter(urlAction as AuditActionFilter);
    }

    const urlFrom = searchParams.get("from");
    if (urlFrom) {
      setFromDate(urlFrom);
    }

    const urlTo = searchParams.get("to");
    if (urlTo) {
      setToDate(urlTo);
    }

    const auditLogId = searchParams.get("auditLogId");
    if (auditLogId) {
      openDrawer(auditLogId);
    }

    appliedRef.current = signature;
  }, [
    openDrawer,
    searchParams,
    setActionFilter,
    setActorUserId,
    setEntityTypeFilter,
    setFromDate,
    setToDate,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (actorUserId) {
      params.set("actorUserId", actorUserId);
    } else {
      params.delete("actorUserId");
    }

    if (entityTypeFilter === "all") {
      params.delete("entityType");
    } else {
      params.set("entityType", entityTypeFilter);
    }

    if (actionFilter === "all") {
      params.delete("action");
    } else {
      params.set("action", actionFilter);
    }

    if (fromDate) {
      params.set("from", fromDate);
    } else {
      params.delete("from");
    }

    if (toDate) {
      params.set("to", toDate);
    } else {
      params.delete("to");
    }

    if (selectedLogId) {
      params.set("auditLogId", selectedLogId);
    } else {
      params.delete("auditLogId");
    }

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [
    actionFilter,
    actorUserId,
    entityTypeFilter,
    fromDate,
    pathname,
    router,
    searchParams,
    selectedLogId,
    toDate,
  ]);
}
