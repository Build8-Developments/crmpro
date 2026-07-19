"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateDeveloperDialog } from "@/features/developers/components/create-developer-dialog";
import { DeleteDeveloperDialog } from "@/features/developers/components/delete-developer-dialog";
import { DevelopersEmptyState } from "@/features/developers/components/developers-empty-state";
import { DevelopersHeader } from "@/features/developers/components/developers-header";
import { DevelopersPagination } from "@/features/developers/components/developers-pagination";
import { DevelopersSkeleton } from "@/features/developers/components/developers-skeleton";
import { DevelopersTable } from "@/features/developers/components/developers-table";
import { DevelopersToolbar } from "@/features/developers/components/developers-toolbar";
import { EditDeveloperDialog } from "@/features/developers/components/edit-developer-dialog";
import { useDevelopers } from "@/features/developers/hooks";
import { useDevelopersUrlState } from "@/features/developers/hooks/use-developers-url-state";
import { useDeveloperUiStore } from "@/features/developers/stores/developer-ui-store";
import type { DevelopersSortField } from "@/features/developers/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const DEVELOPERS_PAGE_SIZE = 50;

export function DevelopersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<DevelopersSortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const debouncedSearch = useDebouncedValue(search, 400);
  const highlightedDeveloperId = useDeveloperUiStore(
    (s) => s.highlightedDeveloperId,
  );
  const setHighlightedDeveloperId = useDeveloperUiStore(
    (s) => s.setHighlightedDeveloperId,
  );

  useDevelopersUrlState({
    debouncedSearch,
    setSearch,
    highlightedDeveloperId,
    setHighlightedDeveloperId,
  });

  const { data, isLoading, isError, isFetching, refetch } = useDevelopers({
    page,
    limit: DEVELOPERS_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    sortBy,
    sortOrder,
  });

  const developers = data?.items ?? [];
  const pagination = data?.pagination;
  const hasSearch = debouncedSearch.trim().length > 0;
  const isEmpty = developers.length === 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSortChange = (
    nextSortBy: DevelopersSortField,
    nextSortOrder: "asc" | "desc",
  ) => {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  };

  if (isLoading && !data) {
    return <DevelopersSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <DevelopersHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load developers
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch your developers catalog. Check your
              connection and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <DevelopersHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <DevelopersToolbar
          search={search}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          hasSearch={hasSearch}
          onClearSearch={() => {
            setSearch("");
            setPage(1);
          }}
          totalItems={pagination?.totalItems ?? developers.length}
          isFetching={isFetching}
        />

        {isEmpty ? (
          <DevelopersEmptyState hasSearch={hasSearch} />
        ) : (
          <>
            <DevelopersTable
              developers={developers}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              highlightedDeveloperId={highlightedDeveloperId}
              onHighlightDeveloper={setHighlightedDeveloperId}
            />
            {pagination ? (
              <DevelopersPagination
                pagination={pagination}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>

      <CreateDeveloperDialog />
      <EditDeveloperDialog />
      <DeleteDeveloperDialog />
    </div>
  );
}
