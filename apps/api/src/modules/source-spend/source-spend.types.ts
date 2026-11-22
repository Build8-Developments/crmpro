export interface SpendCell {
  period: string;
  /** Spend entered for the month; null when none. */
  amount: number | null;
  note: string | null;
  /** Leads created in the month with this source. */
  leads: number;
  /** Leads of this source with a site visit (or "visit done") in the month. */
  visits: number;
  /** Deals reserved in the month on leads of this source (not cancelled). */
  deals: number;
  /** amount ÷ count; null without spend or when the count is 0. */
  costPerLead: number | null;
  costPerVisit: number | null;
  costPerDeal: number | null;
}

export interface SourceSpendRow {
  source: { id: string; name: string };
  months: SpendCell[];
}

export interface SourceSpendResponse {
  from: string;
  to: string;
  periods: string[];
  timeZone: string;
  currency: string;
  sources: SourceSpendRow[];
  /** All sources together, per month. */
  totals: SpendCell[];
}
