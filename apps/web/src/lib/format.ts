/**
 * Display and time formatting helpers for dashboard UI.
 */

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${value.toFixed(1)}h`;
}

export function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${value.toFixed(1)}d`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(value);
}

const compactNumberFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const moneyNumberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

/** "4.5M", "120K", "950". */
export function formatCompactNumber(value: number): string {
  return compactNumberFormat.format(value);
}

/** "5,250,000 EGP", or "5.3M EGP" when compact. */
export function formatMoney(
  amount: number,
  currency = "EGP",
  options: { compact?: boolean } = {},
): string {
  const number = options.compact
    ? compactNumberFormat.format(amount)
    : moneyNumberFormat.format(amount);
  return `${number} ${currency}`;
}

/** "4.5M EGP" — dashboards, targets and lead budgets. */
export function formatCompactMoney(amount: number, currency: string): string {
  return formatMoney(amount, currency, { compact: true });
}

export function formatChartDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return "Just now";
  }

  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfYesterday && date < startOfToday) {
    return "Yesterday";
  }

  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
