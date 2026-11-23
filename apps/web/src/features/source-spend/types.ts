export interface SpendCell {
  period: string;
  amount: number | null;
  note: string | null;
  leads: number;
  visits: number;
  deals: number;
  costPerLead: number | null;
  costPerVisit: number | null;
  costPerDeal: number | null;
}

export interface SourceSpendRow {
  source: { id: string; name: string };
  months: SpendCell[];
}

export interface SourceSpendGrid {
  from: string;
  to: string;
  periods: string[];
  timeZone: string;
  currency: string;
  sources: SourceSpendRow[];
  totals: SpendCell[];
}

export interface SaveSourceSpendInput {
  entries: Array<{ sourceId: string; period: string; amount: number | null; note?: string | null }>;
}
