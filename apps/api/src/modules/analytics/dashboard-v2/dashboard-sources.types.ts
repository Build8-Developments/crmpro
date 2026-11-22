import type { DashboardPeriodKey } from './dashboard-period';

export interface DashboardSourceRow {
  /** Null for leads without a source. */
  sourceId: string | null;
  name: string;
  /** Leads created in the period (the cohort every rate below is about). */
  leads: number;
  contacted: number;
  /** contacted / leads × 100. */
  contactRate: number | null;
  /** Leads with at least one visit (site visit, or a "visit done" outcome). */
  visited: number;
  visitRate: number | null;
  /** Leads now in a WON stage. */
  won: number;
  /** Leads now in any closed stage (won or lost). */
  closed: number;
  /** won / closed × 100. */
  winRate: number | null;
  /** Live (not cancelled) deals on the cohort's leads. */
  deals: number;
  /** Price of the cohort's contracted, not cancelled deals. */
  revenue: number;
  /** Spend for the window (prorated); null when spend is hidden or none was entered. */
  spend: number | null;
  costPerLead: number | null;
  costPerVisit: number | null;
  costPerDeal: number | null;
}

export interface DashboardProjectDemandRow {
  projectId: string;
  name: string;
  developerName: string | null;
  /** Leads that showed interest in the period (interest added in the period). */
  interestedLeads: number;
  /** …of which with interest level HIGH or HOT. */
  hotInterest: number;
  /** Live deals reserved in the period on the project. */
  deals: number;
  /** Contracted in the period, not cancelled. */
  revenue: number;
  /** deals / interestedLeads × 100. */
  conversionRate: number | null;
}

export interface DashboardSourcesResponse {
  period: {
    key: DashboardPeriodKey;
    from: string;
    to: string;
    timeZone: string;
  };
  currency: string;
  /**
   * Spend is entered for the whole workspace; it is only shown to callers who
   * see every lead (otherwise cost per lead would divide workspace spend by a
   * team's leads).
   */
  spendVisible: boolean;
  /** How spend was fitted to the window, for the footnote. */
  spendBasis: 'full-month' | 'prorated';
  sources: DashboardSourceRow[];
  totals: Omit<DashboardSourceRow, 'sourceId' | 'name'>;
  projects: DashboardProjectDemandRow[];
}
