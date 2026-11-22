import type { Request } from 'express';
import type { AuthenticatedApiKey } from '../../api-keys/types/api-key.types';

export interface ApiKeyRequest extends Request {
  apiKey?: AuthenticatedApiKey;
}

/**
 * created: a new lead. duplicate_request: this externalId was already
 * processed (nothing new happened). resubmitted: the phone belongs to an
 * open lead, which was updated and its owner told.
 */
export type InboundLeadStatus = 'created' | 'duplicate_request' | 'resubmitted';

export interface InboundLeadResult {
  leadId: string;
  status: InboundLeadStatus;
}
