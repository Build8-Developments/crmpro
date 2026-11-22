export interface ApiKey {
  id: string;
  name: string;
  /** First characters of the key, to tell keys apart. */
  prefix: string;
  source: { id: string; name: string } | null;
  lastUsedAt: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  revokedAt: string | null;
}

/** Returned once, by create: `apiKey` is the full secret. */
export interface CreatedApiKey extends ApiKey {
  apiKey: string;
}

export interface CreateApiKeyInput {
  name: string;
  sourceId?: string;
}
