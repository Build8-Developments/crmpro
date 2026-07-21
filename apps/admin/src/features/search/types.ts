export type SearchHitType = "tenant" | "plan" | "contract" | "admin";

export interface SearchHit {
  id: string;
  type: SearchHitType;
  title: string;
  subtitle: string;
  href: string;
  status?: string | null;
}

export interface GlobalSearchResult {
  query: string;
  tenants: SearchHit[];
  plans: SearchHit[];
  contracts: SearchHit[];
  admins: SearchHit[];
}
