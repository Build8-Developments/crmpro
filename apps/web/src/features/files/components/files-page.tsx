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
import { DeleteFileDialog } from "@/features/files/components/delete-file-dialog";
import { FilesBulkToolbar } from "@/features/files/components/files-bulk-toolbar";
import { FilesEmptyState } from "@/features/files/components/files-empty-state";
import { FilesHeader } from "@/features/files/components/files-header";
import { FilesPagination } from "@/features/files/components/files-pagination";
import { FilesSkeleton } from "@/features/files/components/files-skeleton";
import { FilesTable } from "@/features/files/components/files-table";
import { FilesToolbar } from "@/features/files/components/files-toolbar";
import { UploadFileDialog } from "@/features/files/components/upload-file-dialog";
import { useFiles } from "@/features/files/hooks";
import { useFilesUrlState } from "@/features/files/hooks/use-files-url-state";
import { useFileUiStore } from "@/features/files/stores/file-ui-store";
import type { FileCategoryFilter, FilesSortField } from "@/features/files/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermissions } from "@/hooks/use-permissions";

const FILES_PAGE_SIZE = 50;

export function FilesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<FilesSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [categoryFilter, setCategoryFilter] =
    useState<FileCategoryFilter>("all");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(search, 400);
  const highlightedFileId = useFileUiStore((s) => s.highlightedFileId);
  const setHighlightedFileId = useFileUiStore((s) => s.setHighlightedFileId);
  const { can } = usePermissions();
  const canDelete = can("file.delete");

  useFilesUrlState({
    debouncedSearch,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    highlightedFileId,
    setHighlightedFileId,
  });

  const { data, isLoading, isError, isFetching, refetch } = useFiles({
    page,
    limit: FILES_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    sortBy,
    sortOrder,
  });

  const files = data?.items ?? [];
  const fileIdsOnPage = new Set(files.map((file) => file.id));
  const activeSelectedIds = selectedFileIds.filter((id) =>
    fileIdsOnPage.has(id),
  );
  const pagination = data?.pagination;
  const hasFilters =
    debouncedSearch.trim().length > 0 || categoryFilter !== "all";
  const isEmpty = files.length === 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    setSelectedFileIds([]);
  };

  const handleCategoryChange = (filter: FileCategoryFilter) => {
    setCategoryFilter(filter);
    setPage(1);
    setSelectedFileIds([]);
  };

  const handleSortChange = (
    nextSortBy: FilesSortField,
    nextSortOrder: "asc" | "desc",
  ) => {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setPage(1);
    setSelectedFileIds([]);
  };

  const handleToggleFile = (fileId: string) => {
    setSelectedFileIds((current) =>
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId],
    );
  };

  const handleToggleAll = (checked: boolean) => {
    setSelectedFileIds(checked ? files.map((file) => file.id) : []);
  };

  if (isLoading && !data) {
    return <FilesSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <FilesHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load files
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch your files. Check your connection and try
              again.
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
      <FilesHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <FilesToolbar
          search={search}
          onSearchChange={handleSearchChange}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={handleCategoryChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          totalItems={pagination?.totalItems ?? files.length}
          isFetching={isFetching}
        />

        {canDelete ? (
          <FilesBulkToolbar
            selectedCount={activeSelectedIds.length}
            selectedFileIds={activeSelectedIds}
            onClearSelection={() => setSelectedFileIds([])}
          />
        ) : null}

        {isEmpty ? (
          <FilesEmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <FilesTable
              files={files}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              selectedFileIds={activeSelectedIds}
              onToggleFile={handleToggleFile}
              onToggleAll={handleToggleAll}
              canSelect={canDelete}
              highlightedFileId={highlightedFileId}
              onHighlightFile={setHighlightedFileId}
            />
            {pagination ? (
              <FilesPagination
                pagination={pagination}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  setSelectedFileIds([]);
                }}
              />
            ) : null}
          </>
        )}
      </div>

      <UploadFileDialog />
      <DeleteFileDialog />
    </div>
  );
}
