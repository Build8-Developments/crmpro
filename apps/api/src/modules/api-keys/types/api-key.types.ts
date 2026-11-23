export interface ApiKeySummary {
  id: string;
  name: string;
  /** First characters of the key; the rest is never stored. */
  prefix: string;
  source: { id: string; name: string } | null;
  lastUsedAt: Date | null;
  createdBy: { id: string; name: string } | null;
  createdAt: Date;
  revokedAt: Date | null;
}

/** Returned once, on creation: the only time the raw key is available. */
export interface CreatedApiKey extends ApiKeySummary {
  apiKey: string;
}

/** An active key resolved from a request, attached to it by the guard. */
export interface AuthenticatedApiKey {
  id: string;
  tenantId: string;
  name: string;
  sourceId: string | null;
  lastUsedAt: Date | null;
}
