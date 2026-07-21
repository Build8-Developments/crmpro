"use client";

import { Suspense, useCallback, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ContractActivateDialog,
  ContractArchiveDialog,
  ContractTerminateDialog,
} from "@/features/contracts/components/contract-action-dialogs";
import { ContractFormDialog } from "@/features/contracts/components/contract-form-dialog";
import { ContractsEmptyState } from "@/features/contracts/components/contracts-empty-state";
import { ContractsHeader } from "@/features/contracts/components/contracts-header";
import { ContractsPagination } from "@/features/contracts/components/contracts-pagination";
import { ContractsSkeleton } from "@/features/contracts/components/contracts-skeleton";
import { ContractsTable } from "@/features/contracts/components/contracts-table";
import { ContractsToolbar } from "@/features/contracts/components/contracts-toolbar";
import { useContracts } from "@/features/contracts/hooks";
import { useContractsUrlState } from "@/features/contracts/hooks/use-contracts-url-state";
import type {
  ContractListItem,
  ContractStatus,
  PaymentFrequency,
  PaymentMethod,
} from "@/features/contracts/types";
import { usePlans } from "@/features/plans/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useOpenCreateFromQuery } from "@/hooks/use-open-create-from-query";

const CONTRACTS_PAGE_SIZE = 50;

export function ContractsPage() {
  return (
    <Suspense fallback={<ContractsSkeleton />}>
      <ContractsPageContent />
    </Suspense>
  );
}

function ContractsPageContent() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ContractStatus | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(
    null,
  );
  const [activateContract, setActivateContract] =
    useState<ContractListItem | null>(null);
  const [terminateContract, setTerminateContract] =
    useState<ContractListItem | null>(null);
  const [archiveContract, setArchiveContract] =
    useState<ContractListItem | null>(null);
  const debouncedSearch = useDebouncedValue(search, 400);

  useContractsUrlState({
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
  });

  const { data: plansData, isLoading: plansLoading } = usePlans({
    limit: 100,
  });

  const { data, isLoading, isError, isFetching, refetch } = useContracts({
    page,
    limit: CONTRACTS_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    status: status ?? undefined,
    planId: planId ?? undefined,
    currency: currency ?? undefined,
    paymentMethod: paymentMethod ?? undefined,
    paymentFrequency: paymentFrequency ?? undefined,
  });

  const contracts = data?.items ?? [];
  const pagination = data?.pagination;
  const hasFilters =
    debouncedSearch.trim().length > 0 ||
    status !== null ||
    planId !== null ||
    currency !== null ||
    paymentMethod !== null ||
    paymentFrequency !== null;
  const isEmpty = contracts.length === 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const resetPage = <T,>(setter: (value: T) => void) => {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus(null);
    setPlanId(null);
    setCurrency(null);
    setPaymentMethod(null);
    setPaymentFrequency(null);
    setPage(1);
  };

  const handleCreate = useCallback(() => {
    setEditingContractId(null);
    setFormOpen(true);
  }, []);

  useOpenCreateFromQuery(handleCreate);

  const handleEdit = (contract: ContractListItem) => {
    setEditingContractId(contract.id);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingContractId(null);
  };

  if (isLoading && !data) {
    return <ContractsSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <ContractsHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load contracts
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch contracts. Check your connection and try
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
      <ContractsHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <ContractsToolbar
          search={search}
          onSearchChange={handleSearchChange}
          status={status}
          onStatusChange={resetPage(setStatus)}
          planId={planId}
          onPlanIdChange={resetPage(setPlanId)}
          planOptions={plansData?.items ?? []}
          plansLoading={plansLoading}
          currency={currency}
          onCurrencyChange={resetPage(setCurrency)}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={resetPage(setPaymentMethod)}
          paymentFrequency={paymentFrequency}
          onPaymentFrequencyChange={resetPage(setPaymentFrequency)}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          totalItems={pagination?.totalItems ?? contracts.length}
          isFetching={isFetching}
          onCreate={handleCreate}
        />

        {isEmpty ? (
          <ContractsEmptyState
            hasFilters={hasFilters}
            onCreate={handleCreate}
          />
        ) : (
          <>
            <ContractsTable
              contracts={contracts}
              onEdit={handleEdit}
              onActivate={setActivateContract}
              onTerminate={setTerminateContract}
              onArchive={setArchiveContract}
            />
            {pagination ? (
              <ContractsPagination
                pagination={pagination}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>

      <ContractFormDialog
        open={formOpen}
        contractId={editingContractId}
        onClose={handleCloseForm}
      />
      <ContractActivateDialog
        contract={activateContract}
        open={Boolean(activateContract)}
        onClose={() => setActivateContract(null)}
      />
      <ContractTerminateDialog
        contract={terminateContract}
        open={Boolean(terminateContract)}
        onClose={() => setTerminateContract(null)}
      />
      <ContractArchiveDialog
        contract={archiveContract}
        open={Boolean(archiveContract)}
        onClose={() => setArchiveContract(null)}
      />
    </div>
  );
}
