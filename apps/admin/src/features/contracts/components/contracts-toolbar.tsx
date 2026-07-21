"use client";

import { ADMIN_PERMISSIONS } from "@crmpro/shared";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTRACT_CURRENCY_OPTIONS,
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABELS,
  PAYMENT_FREQUENCIES,
  PAYMENT_FREQUENCY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type ContractStatus,
  type PaymentFrequency,
  type PaymentMethod,
} from "@/features/contracts/types";
import type { PlanListItem } from "@/features/plans/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ContractsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ContractStatus | null;
  onStatusChange: (status: ContractStatus | null) => void;
  planId: string | null;
  onPlanIdChange: (planId: string | null) => void;
  planOptions: PlanListItem[];
  plansLoading?: boolean;
  currency: string | null;
  onCurrencyChange: (currency: string | null) => void;
  paymentMethod: PaymentMethod | null;
  onPaymentMethodChange: (method: PaymentMethod | null) => void;
  paymentFrequency: PaymentFrequency | null;
  onPaymentFrequencyChange: (frequency: PaymentFrequency | null) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  isFetching?: boolean;
  onCreate: () => void;
}

export function ContractsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  planId,
  onPlanIdChange,
  planOptions,
  plansLoading,
  currency,
  onCurrencyChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentFrequency,
  onPaymentFrequencyChange,
  hasFilters,
  onClearFilters,
  totalItems,
  isFetching,
  onCreate,
}: ContractsToolbarProps) {
  const { can } = usePermissions();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search contracts..."
          className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
          aria-label="Search contracts"
        />
      </div>

      <Select
        value={status ?? "all"}
        onValueChange={(value) =>
          onStatusChange(value === "all" ? null : (value as ContractStatus))
        }
      >
        <SelectTrigger className="h-8 w-[8.5rem] text-xs" size="sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          {CONTRACT_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {CONTRACT_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={planId ?? "all"}
        onValueChange={(value) =>
          onPlanIdChange(value === "all" ? null : value)
        }
        disabled={plansLoading}
      >
        <SelectTrigger className="h-8 w-[9.5rem] text-xs" size="sm">
          <SelectValue placeholder="Plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All plans</SelectItem>
          {planOptions.map((plan) => (
            <SelectItem key={plan.id} value={plan.id}>
              {plan.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currency ?? "all"}
        onValueChange={(value) =>
          onCurrencyChange(value === "all" ? null : value)
        }
      >
        <SelectTrigger className="h-8 w-[7.5rem] text-xs" size="sm">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All currencies</SelectItem>
          {CONTRACT_CURRENCY_OPTIONS.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={paymentMethod ?? "all"}
        onValueChange={(value) =>
          onPaymentMethodChange(
            value === "all" ? null : (value as PaymentMethod),
          )
        }
      >
        <SelectTrigger className="h-8 w-[9rem] text-xs" size="sm">
          <SelectValue placeholder="Payment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All methods</SelectItem>
          {PAYMENT_METHODS.map((value) => (
            <SelectItem key={value} value={value}>
              {PAYMENT_METHOD_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={paymentFrequency ?? "all"}
        onValueChange={(value) =>
          onPaymentFrequencyChange(
            value === "all" ? null : (value as PaymentFrequency),
          )
        }
      >
        <SelectTrigger className="h-8 w-[8.5rem] text-xs" size="sm">
          <SelectValue placeholder="Frequency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All frequencies</SelectItem>
          {PAYMENT_FREQUENCIES.map((value) => (
            <SelectItem key={value} value={value}>
              {PAYMENT_FREQUENCY_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={onClearFilters}
        >
          <AppIcons.close className="size-3.5" />
          Clear
        </Button>
      ) : null}

      <span
        className={cn(
          "text-xs tabular-nums text-muted-foreground",
          isFetching && "opacity-70",
        )}
      >
        {formatNumber(totalItems)} contracts
      </span>

      {can(ADMIN_PERMISSIONS.CONTRACT_CREATE) ? (
        <Button size="sm" className="ml-auto h-8" onClick={onCreate}>
          <AppIcons.create className="size-3.5" />
          New contract
        </Button>
      ) : null}
    </div>
  );
}
