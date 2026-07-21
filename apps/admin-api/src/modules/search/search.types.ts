export interface SearchHit {
  id: string;
  type: 'tenant' | 'plan' | 'contract' | 'admin';
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
