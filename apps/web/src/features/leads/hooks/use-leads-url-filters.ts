"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { useLeadsTableStore } from "@/features/leads/stores/leads-table-store";
import {
  buildLeadsQueryString,
  hasLeadsFilterParams,
  leadsUrlStateKey,
  parseLeadsUrlState,
  sameQueryString,
  type LeadsUrlState,
} from "@/features/leads/utils/leads-url-state";

/** Typing in the search box writes the URL once the user pauses. */
const SEARCH_WRITE_DELAY_MS = 400;
/** Other changes are batched briefly (typed sheet fields, multi-step updates). */
const FILTER_WRITE_DELAY_MS = 250;

type TableState = ReturnType<typeof useLeadsTableStore.getState>;

function pickUrlState(state: TableState): LeadsUrlState {
  return {
    filters: state.filters,
    search: state.search,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    layout: state.layout,
  };
}

/**
 * Two-way sync between the leads list state (store) and the URL.
 *
 * - Store → URL: every filter / search / sort / layout change rewrites the
 *   query with `router.replace` (no history entries), debounced; defaults are
 *   left out and other params (`id` of the open lead) are kept.
 * - URL → store: arriving with filters in the URL (dashboard or shared link)
 *   replaces whatever was set before; later URL changes that did not come
 *   from this hook (Back/Forward, a link to /leads?… while on the page) are
 *   applied too. Arriving without filters keeps the current ones and writes
 *   them to the URL.
 * - No loops: `syncedKey` is the state key the URL is known to hold (written
 *   or applied). A URL change whose key equals it is our own echo, or only
 *   touched `id`, and is ignored; a store change writes only when the query
 *   string actually differs.
 * - `?id=` opens the lead drawer whenever it changes.
 */
export function useLeadsUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const applyUrlState = useLeadsTableStore((state) => state.applyUrlState);
  const setLayout = useLeadsTableStore((state) => state.setLayout);
  const openDrawer = useLeadUiStore((state) => state.openDrawer);

  const syncedKeyRef = useRef<string | null>(null);
  const openedIdRef = useRef<string | null>(null);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const writeUrl = useCallback(() => {
    clearTimeout(writeTimerRef.current);
    // A write scheduled just before leaving the page must not touch the next one.
    if (window.location.pathname !== pathname) return;
    const urlState = pickUrlState(useLeadsTableStore.getState());
    const current = new URLSearchParams(window.location.search);
    const next = buildLeadsQueryString(current, urlState);
    syncedKeyRef.current = leadsUrlStateKey(urlState);
    if (sameQueryString(next, current.toString())) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router]);

  // Store → URL.
  useEffect(() => {
    const unsubscribe = useLeadsTableStore.subscribe((state, previous) => {
      const filtersChanged =
        state.filters !== previous.filters ||
        state.sortBy !== previous.sortBy ||
        state.sortOrder !== previous.sortOrder ||
        state.layout !== previous.layout;
      const searchChanged = state.search !== previous.search;
      if (!filtersChanged && !searchChanged) return;
      clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(
        writeUrl,
        filtersChanged ? FILTER_WRITE_DELAY_MS : SEARCH_WRITE_DELAY_MS,
      );
    });
    return () => {
      unsubscribe();
      clearTimeout(writeTimerRef.current);
    };
  }, [writeUrl]);

  // URL → store.
  useEffect(() => {
    const leadId = searchParams.get("id");
    if (leadId && leadId !== openedIdRef.current) openDrawer(leadId);
    openedIdRef.current = leadId;

    const parsed = parseLeadsUrlState(searchParams);
    const urlKey = leadsUrlStateKey(parsed);

    if (syncedKeyRef.current === null) {
      // Arrival on the page.
      if (hasLeadsFilterParams(searchParams)) {
        syncedKeyRef.current = urlKey;
        applyUrlState(parsed);
      } else {
        // Keep the filters from earlier in the session; `?view=board` alone still switches layout.
        if (parsed.layout === "board") setLayout("board");
        writeUrl();
      }
      return;
    }

    // Our own write echoing back, or only `id` / unrelated params changed.
    if (urlKey === syncedKeyRef.current) return;

    // Back/Forward or a link while on the page: the URL wins over a pending write.
    clearTimeout(writeTimerRef.current);
    syncedKeyRef.current = urlKey;
    applyUrlState(parsed);
  }, [searchParams, applyUrlState, setLayout, openDrawer, writeUrl]);
}
