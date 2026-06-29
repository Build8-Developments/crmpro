import type { ApiErrorCode } from './error-codes';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type StructuredApiErrorPayload = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};
