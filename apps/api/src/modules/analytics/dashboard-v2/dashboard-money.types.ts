import type { DashboardPeriodKey } from './dashboard-period';

/** Whose targets apply: the workspace goal, the team members' sum, or own. */
export type MoneyTargetOwner = 'workspace' | 'team' | 'own';

/**
 * - `month`: the window is one calendar month; its target applies as-is.
 * - `prorated`: each touched month's target × the share of that month inside
 *   the window (so a 30-day window ≈ one month of target).
 */
export type MoneyTargetBasis = 'month' | 'prorated';

export interface MoneyTarget {
  value: number;
  basis: MoneyTargetBasis;
  owner: MoneyTargetOwner;
  /** actual / target × 100, not capped; null when the target is 0. */
  percent: number | null;
  /**
   * Month to date only: where the actual should be by now at an even
   * (calendar) pace through the month. Null otherwise.
   */
  expectedByNow: number | null;
}

export interface MoneyMetric {
  current: number;
  previous: number;
  /** (current − previous) / previous × 100; null when previous is 0. */
  changePercent: number | null;
  /** Null when no target is set for any month of the window. */
  target: MoneyTarget | null;
}

export interface DealBucket {
  count: number;
  value: number;
  previousCount: number;
  previousValue: number;
  countChangePercent: number | null;
  valueChangePercent: number | null;
  /** `/deals?…` parameters for the deals in this bucket (current window). */
  listQuery: Record<string, string>;
}

export interface ForecastStageRow {
  stageId: string;
  stageName: string;
  pipelineId: string;
  pipelineName: string;
  openLeads: number;
  /** Closed leads (lookback) that reached this stage or a later one. */
  reachedCount: number;
  /** …of which ended WON. */
  wonCount: number;
  /** wonCount / reachedCount (0–1); null without history. */
  winRate: number | null;
  expectedDeals: number;
  expectedRevenue: number;
  /** `/leads?…` for the open leads of the stage. */
  listQuery: Record<string, string>;
}

/** GET /analytics/v2/money — spec §5.2. */
export interface DashboardMoneyResponse {
  period: {
    key: DashboardPeriodKey;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    months: string[];
    month: string | null;
  };
  currency: string;
  /** Price of deals contracted in the window and not cancelled since. */
  revenue: MoneyMetric;
  /** Commission amount of the same deals. */
  commission: MoneyMetric;
  deals: {
    /** Reserved in the window, not cancelled since (= the DEALS target). */
    reserved: DealBucket & { target: MoneyTarget | null };
    /** Contracted in the window, not cancelled since. */
    contracted: DealBucket;
    /** Cancelled in the window (value = price lost). */
    cancelled: DealBucket;
  };
  /** Live: every deal still RESERVED (not contracted, not cancelled). */
  reservedBacklog: {
    count: number;
    value: number;
    listQuery: Record<string, string>;
  };
  forecast: {
    /** One-line explanation for the UI. */
    method: string;
    lookbackMonths: number;
    /** Mean price of non-cancelled deals reserved in the lookback. */
    averageDealPrice: number;
    averageDealSampleSize: number;
    stages: ForecastStageRow[];
    totals: {
      openLeads: number;
      expectedDeals: number;
      expectedRevenue: number;
    };
  };
  trend: {
    granularity: 'day' | 'week';
    /** Contracted revenue per bucket; `previous` is the same bucket index of the previous window. */
    points: Array<{
      /** Local start date of the bucket, "YYYY-MM-DD". */
      date: string;
      previousDate: string;
      current: number;
      previous: number;
    }>;
  };
}
