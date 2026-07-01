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

const FILES_PAGE_SIZE = 50;

export function FilesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<FilesSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [categoryFilter, setCategoryFilter] = useState<FileCategoryFilter>("all");
  const debouncedSearch = useDebouncedValue(search, 400);
  const highlightedFileId = useFileUiStore((s) => s.highlightedFileId);
  const setHighlightedFileId = useFileUiStore((s) => s.setHighlightedFileId);

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
  const pagination = data?.pagination;
  const hasFilters =
    debouncedSearch.trim().length > 0 || categoryFilter !== "all";
  const isEmpty = files.length === 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (filter: FileCategoryFilter) => {
    setCategoryFilter(filter);
    setPage(1);
  };

  const handleSortChange = (
    nextSortBy: FilesSortField,
    nextSortOrder: "asc" | "desc",
  ) => {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  };

  if (isLoading && !data) {
    return <FilesSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
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
    <div className="space-y-6 px-6 py-6 md:px-8">
      <FilesHeader />

      <div className="space-y-3">
        <FilesToolbar
          search={search}
          onSearchChange={handleSearchChange}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={handleCategoryChange}
          totalItems={pagination?.totalItems ?? files.length}
          isFetching={isFetching}
        />

        {isEmpty ? (
          <FilesEmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <FilesTable
              files={files}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              highlightedFileId={highlightedFileId}
              onHighlightFile={setHighlightedFileId}
            />
            {pagination ? (
              <FilesPagination
                pagination={pagination}
                onPageChange={setPage}
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
