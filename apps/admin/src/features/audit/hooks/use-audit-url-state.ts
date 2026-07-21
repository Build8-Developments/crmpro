"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  AdminSecurityEventType,
  AuditTab,
  SecuritySeverity,
} from "@/features/audit/types";
import {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
} from "@/features/audit/types";

interface UseAuditUrlStateOptions {
  tab: AuditTab;
  setTab: (tab: AuditTab) => void;
  debouncedSearch: string;
  setSearch: (value: string) => void;
  action: string;
  setAction: (value: string) => void;
  entityType: string;
  setEntityType: (value: string) => void;
  actorAdminId: string;
  setActorAdminId: (value: string) => void;
  tenantId: string;
  setTenantId: (value: string) => void;
  from: string;
  setFrom: (value: string) => void;
  to: string;
  setTo: (value: string) => void;
  eventType: AdminSecurityEventType | null;
  setEventType: (value: AdminSecurityEventType | null) => void;
  severity: SecuritySeverity | null;
  setSeverity: (value: SecuritySeverity | null) => void;
  adminId: string;
  setAdminId: (value: string) => void;
  page: number;
  setPage: (page: number) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

function parseTab(value: string | null): AuditTab {
  return value === "security" ? "security" : "audit";
}

function parseEventType(value: string | null): AdminSecurityEventType | null {
  if (!value) return null;
  return SECURITY_EVENT_TYPES.includes(value as AdminSecurityEventType)
    ? (value as AdminSecurityEventType)
    : null;
}

function parseSeverity(value: string | null): SecuritySeverity | null {
  if (!value) return null;
  return SECURITY_SEVERITIES.includes(value as SecuritySeverity)
    ? (value as SecuritySeverity)
    : null;
}

export function useAuditUrlState(options: UseAuditUrlStateOptions) {
  const {
    tab,
    setTab,
    debouncedSearch,
    setSearch,
    action,
    setAction,
    entityType,
    setEntityType,
    actorAdminId,
    setActorAdminId,
    tenantId,
    setTenantId,
    from,
    setFrom,
    to,
    setTo,
    eventType,
    setEventType,
    severity,
    setSeverity,
    adminId,
    setAdminId,
    page,
    setPage,
    selectedId,
    setSelectedId,
  } = options;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const appliedRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const signature = searchParams.toString();
    if (appliedRef.current === signature) {
      return;
    }

    setTab(parseTab(searchParams.get("tab")));

    const urlSearch = searchParams.get("search");
    if (urlSearch !== null) setSearch(urlSearch);

    setAction(searchParams.get("action") ?? "");
    setEntityType(searchParams.get("entityType") ?? "");
    setActorAdminId(searchParams.get("actorAdminId") ?? "");
    setTenantId(searchParams.get("tenantId") ?? "");
    setFrom(searchParams.get("from") ?? "");
    setTo(searchParams.get("to") ?? "");
    setEventType(parseEventType(searchParams.get("eventType")));
    setSeverity(parseSeverity(searchParams.get("severity")));
    setAdminId(searchParams.get("adminId") ?? "");
    setSelectedId(searchParams.get("id"));

    const urlPage = Number(searchParams.get("page") ?? "1");
    if (Number.isFinite(urlPage) && urlPage >= 1) {
      setPage(urlPage);
    }

    appliedRef.current = signature;
    hydratedRef.current = true;
  }, [
    searchParams,
    setAction,
    setActorAdminId,
    setAdminId,
    setEntityType,
    setEventType,
    setFrom,
    setPage,
    setSearch,
    setSelectedId,
    setSeverity,
    setTab,
    setTenantId,
    setTo,
  ]);

  useEffect(() => {
    if (!hydratedRef.current && searchParams.toString()) {
      return;
    }

    const params = new URLSearchParams();

    if (tab !== "audit") {
      params.set("tab", tab);
    }

    const nextSearch = debouncedSearch.trim();
    if (nextSearch) params.set("search", nextSearch);

    if (tab === "audit") {
      if (action.trim()) params.set("action", action.trim());
      if (entityType.trim()) params.set("entityType", entityType.trim());
      if (actorAdminId.trim()) params.set("actorAdminId", actorAdminId.trim());
      if (tenantId.trim()) params.set("tenantId", tenantId.trim());
    } else {
      if (eventType) params.set("eventType", eventType);
      if (severity) params.set("severity", severity);
      if (adminId.trim()) params.set("adminId", adminId.trim());
    }

    if (from.trim()) params.set("from", from.trim());
    if (to.trim()) params.set("to", to.trim());
    if (page > 1) params.set("page", String(page));
    if (selectedId) params.set("id", selectedId);

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      appliedRef.current = next;
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [
    action,
    actorAdminId,
    adminId,
    debouncedSearch,
    entityType,
    eventType,
    from,
    page,
    pathname,
    router,
    searchParams,
    selectedId,
    severity,
    tab,
    tenantId,
    to,
  ]);
}
